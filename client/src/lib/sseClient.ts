/**
 * Framework-agnostic Server-Sent Events helper. Deliberately knows nothing
 * about React or the query cache — it just opens an `EventSource`, parses JSON
 * payloads, and routes each named event to a handler. Callers (e.g. a React
 * hook) layer their own behaviour on top and own the returned teardown.
 */

export type SseEventHandler<T = unknown> = (data: T) => void

export interface SseHandlers {
  /** Named events, e.g. `{ indexing: fn, snapshot: fn }`. */
  events?: Record<string, SseEventHandler>
  /** Unnamed `message` events. */
  onMessage?: SseEventHandler
  /** Transport error (the browser auto-reconnects afterwards). */
  onError?: (event: Event) => void
  /** Fires once the connection opens. */
  onOpen?: () => void
}

export interface SseOptions {
  /** Send cookies with the request; required for the session-authenticated API. */
  withCredentials?: boolean
}

function parse<T>(raw: string): T | string {
  try {
    return JSON.parse(raw) as T
  } catch {
    return raw
  }
}

/**
 * Subscribe to an SSE endpoint. Returns an unsubscribe function that removes
 * every listener and closes the connection — safe to call multiple times.
 */
export function subscribeToSse(
  url: string,
  handlers: SseHandlers,
  options: SseOptions = {},
): () => void {
  const source = new EventSource(url, { withCredentials: options.withCredentials ?? true })

  const registered: Array<{ type: string; listener: EventListener }> = []

  const on = (type: string, handler: SseEventHandler) => {
    const listener: EventListener = (event) => {
      const data = (event as MessageEvent).data
      handler(typeof data === 'string' ? parse(data) : data)
    }
    source.addEventListener(type, listener)
    registered.push({ type, listener })
  }

  if (handlers.events) {
    for (const [type, handler] of Object.entries(handlers.events)) on(type, handler)
  }
  if (handlers.onMessage) {
    source.onmessage = (event) => handlers.onMessage!(parse(event.data))
  }
  if (handlers.onOpen) source.onopen = () => handlers.onOpen!()
  if (handlers.onError) source.onerror = handlers.onError

  return () => {
    for (const { type, listener } of registered) source.removeEventListener(type, listener)
    source.onmessage = null
    source.onopen = null
    source.onerror = null
    source.close()
  }
}
