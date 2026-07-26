/** Parse a YouTube watch / short / embed URL (or bare id) into an 11-char id. */
export function parseYoutubeId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) return match[1]
  }

  return /^[\w-]{11}$/.test(input.trim()) ? input.trim() : null
}

export function buildYoutubeEmbed(url: string, startSeconds = 0): string | null {
  const id = parseYoutubeId(url)
  if (!id) return null
  const start = Math.max(0, Math.floor(startSeconds))
  const params = new URLSearchParams({ autoplay: '1', rel: '0' })
  if (start > 0) params.set('start', String(start))
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

/** Browser PDF viewers honour `#page=N` on the document URL. */
export function pdfViewerUrl(downloadUrl: string, page?: number): string {
  if (!page || page < 1) return downloadUrl
  const base = downloadUrl.split('#')[0]
  return `${base}#page=${page}`
}
