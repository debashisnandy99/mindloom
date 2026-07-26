import { API_BASE, ApiError } from './apiClient'

/**
 * Reads an SSE stream that is served over a POST request.
 *
 * `EventSource` can only issue GETs, and the ask endpoint needs a JSON body,
 * so the frames are parsed by hand off `fetch`'s ReadableStream. Like
 * `sseClient`, this module is deliberately React-free — callers layer their own
 * state handling on top.
 */

export interface StreamFrame {
  event: string
  data: unknown
}

export interface StreamOptions {
  body?: unknown
  signal?: AbortSignal
  /** Called for every parsed frame, in arrival order. */
  onFrame: (frame: StreamFrame) => void
}

function parseData(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

/**
 * Splits an SSE wire chunk into frames. A frame is separated by a blank line
 * and may span multiple `data:` lines, which are joined with newlines per spec.
 */
function parseBlock(block: string): StreamFrame | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of block.split('\n')) {
    if (line.startsWith(':')) continue // comment / heartbeat
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
  }

  if (dataLines.length === 0) return null
  return { event, data: parseData(dataLines.join('\n')) }
}

export async function streamSse(path: string, options: StreamOptions): Promise<void> {
  const { body, signal, onFrame } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }

  // Mirror `apiFetch`: writes carry the CSRF token when the server enables it.
  const { getCsrfToken } = await import('./csrf')
  const token = await getCsrfToken()
  if (token) headers['X-CSRF-Token'] = token

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  // Failures happen before the stream opens, so the body is still JSON here.
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; errors?: { path: string; message: string }[] }
      | null
    throw new ApiError(
      response.status,
      payload?.message ?? `Request failed with status ${response.status}`,
      payload?.errors,
    )
  }

  if (!response.body) throw new ApiError(500, 'Response did not include a stream')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Frames are delimited by a blank line; the trailing partial stays buffered.
      const blocks = buffer.split(/\n\n/)
      buffer = blocks.pop() ?? ''

      for (const block of blocks) {
        const frame = parseBlock(block)
        if (frame) onFrame(frame)
      }
    }

    const tail = parseBlock(buffer)
    if (tail) onFrame(tail)
  } finally {
    reader.cancel().catch(() => undefined)
  }
}
