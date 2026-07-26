import type { Source, ServerSourceType } from '../../../api/types'
import { useSource } from '../../../hooks/queries/useSources'
import { buildYoutubeEmbed, pdfViewerUrl } from '../../../lib/mediaUrls'
import type { CitationLocator } from '../../../store/slices/sourcesSlice'

interface SourceViewerProps {
  source: Source
  citation: CitationLocator | null
}

function metaLine(type: ServerSourceType, citation: CitationLocator | null, fallback: string): string {
  if (citation?.sourceType === 'YT' && (citation.timestamp || citation.startSeconds != null)) {
    const stamp = citation.timestamp ?? formatSeconds(citation.startSeconds ?? 0)
    return `● YouTube · ${stamp}`
  }
  if (citation?.sourceType === 'PDF' && citation.pageNumber != null) {
    return `● PDF · page ${citation.pageNumber}`
  }
  if (type === 'YT') return '● YouTube'
  if (type === 'PDF') return '● PDF'
  return `● indexed · ${fallback}`
}

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

export function SourceViewerMeta({
  source,
  citation,
}: SourceViewerProps) {
  return (
    <div className="side-panel__viewer-meta">
      {metaLine(source.type, citation, source.meta)}
    </div>
  )
}

export function SourceViewer({ source, citation }: SourceViewerProps) {
  const type = citation?.sourceType ?? source.type
  const contentUrl = citation?.contentUrl || source.content

  if (type === 'YT') {
    return <YoutubeViewer url={contentUrl} startSeconds={citation?.startSeconds ?? 0} excerpt={citation?.chunkText} />
  }

  if (type === 'PDF') {
    return <PdfViewer sourceId={source.id} page={citation?.pageNumber} excerpt={citation?.chunkText} />
  }

  if (type === 'URL' || type === 'GDOC') {
    return (
      <LinkViewer
        url={contentUrl}
        excerpt={citation?.chunkText}
        keyPoints={citation ? undefined : source.keyPoints}
        excerpts={citation ? undefined : source.excerpts}
      />
    )
  }

  return (
    <TextViewer
      content={source.content}
      excerpt={citation?.chunkText}
      keyPoints={citation ? undefined : source.keyPoints}
      excerpts={citation ? undefined : source.excerpts}
    />
  )
}

function YoutubeViewer({
  url,
  startSeconds,
  excerpt,
}: {
  url: string
  startSeconds: number
  excerpt?: string
}) {
  const embed = buildYoutubeEmbed(url, startSeconds)

  return (
    <div className="side-panel__viewer-media">
      {embed ? (
        <iframe
          key={`${embed}`}
          className="side-panel__viewer-iframe side-panel__viewer-iframe--yt"
          src={embed}
          title="YouTube citation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <p className="side-panel__viewer-paragraph">Could not parse this YouTube URL.</p>
      )}
      {excerpt && (
        <>
          <div className="side-panel__viewer-section-title">CITED PASSAGE</div>
          <p className="side-panel__viewer-paragraph side-panel__viewer-paragraph--cite">{stripSourceHeader(excerpt)}</p>
        </>
      )}
    </div>
  )
}

function PdfViewer({
  sourceId,
  page,
  excerpt,
}: {
  sourceId: string
  page?: number
  excerpt?: string
}) {
  const { data, isLoading, isError } = useSource(sourceId)
  const downloadUrl = data?.downloadUrl

  return (
    <div className="side-panel__viewer-media">
      {isLoading && <p className="side-panel__viewer-paragraph">Loading PDF…</p>}
      {isError && <p className="side-panel__viewer-paragraph">Failed to load PDF URL.</p>}
      {downloadUrl && (
        <iframe
          key={`${downloadUrl}-${page ?? 1}`}
          className="side-panel__viewer-iframe side-panel__viewer-iframe--pdf"
          src={pdfViewerUrl(downloadUrl, page)}
          title="PDF citation"
        />
      )}
      {excerpt && (
        <>
          <div className="side-panel__viewer-section-title">CITED PASSAGE</div>
          <p className="side-panel__viewer-paragraph side-panel__viewer-paragraph--cite">{stripSourceHeader(excerpt)}</p>
        </>
      )}
    </div>
  )
}

function LinkViewer({
  url,
  excerpt,
  keyPoints,
  excerpts,
}: {
  url: string
  excerpt?: string
  keyPoints?: string[]
  excerpts?: string[]
}) {
  return (
    <div className="side-panel__viewer-media">
      {excerpt ? (
        <>
          <div className="side-panel__viewer-section-title">CITED PASSAGE</div>
          <p className="side-panel__viewer-paragraph side-panel__viewer-paragraph--cite">{stripSourceHeader(excerpt)}</p>
        </>
      ) : (
        <FallbackPoints keyPoints={keyPoints} excerpts={excerpts} />
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="side-panel__viewer-open-link ml-press"
        >
          Open original →
        </a>
      )}
    </div>
  )
}

function TextViewer({
  content,
  excerpt,
  keyPoints,
  excerpts,
}: {
  content: string
  excerpt?: string
  keyPoints?: string[]
  excerpts?: string[]
}) {
  if (excerpt) {
    const body = content || ''
    const needle = stripSourceHeader(excerpt)
    const idx = body.indexOf(needle.slice(0, Math.min(80, needle.length)))

    if (idx >= 0 && body) {
      const before = body.slice(0, idx)
      const hit = body.slice(idx, idx + needle.length)
      const after = body.slice(idx + needle.length)
      return (
        <div className="side-panel__viewer-media">
          <div className="side-panel__viewer-section-title">TEXT</div>
          <p className="side-panel__viewer-paragraph">
            {before}
            <mark className="side-panel__viewer-mark">{hit || needle}</mark>
            {after}
          </p>
        </div>
      )
    }

    return (
      <div className="side-panel__viewer-media">
        <div className="side-panel__viewer-section-title">CITED PASSAGE</div>
        <p className="side-panel__viewer-paragraph side-panel__viewer-paragraph--cite">{needle}</p>
        {content && (
          <>
            <div className="side-panel__viewer-section-title side-panel__viewer-section-title--excerpt">FULL TEXT</div>
            <p className="side-panel__viewer-paragraph">{content}</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="side-panel__viewer-media">
      <FallbackPoints keyPoints={keyPoints} excerpts={excerpts} />
      {content && !keyPoints?.length && !excerpts?.length && (
        <p className="side-panel__viewer-paragraph">{content}</p>
      )}
    </div>
  )
}

function FallbackPoints({
  keyPoints,
  excerpts,
}: {
  keyPoints?: string[]
  excerpts?: string[]
}) {
  return (
    <>
      <div className="side-panel__viewer-section-title">KEY POINTS</div>
      {!keyPoints?.length && (
        <div className="side-panel__viewer-point"><span>No key points extracted.</span></div>
      )}
      {keyPoints?.map((p, i) => (
        <div key={i} className="side-panel__viewer-point">
          <span className="side-panel__viewer-point-bullet">·</span>
          <span>{p}</span>
        </div>
      ))}
      {!!excerpts?.length && (
        <>
          <div className="side-panel__viewer-section-title side-panel__viewer-section-title--excerpt">EXCERPT</div>
          {excerpts.map((p, i) => (
            <p key={i} className="side-panel__viewer-paragraph">{p}</p>
          ))}
        </>
      )}
    </>
  )
}

/** Chunk text is prefixed with `Source: …` at index time — strip for display. */
function stripSourceHeader(text: string): string {
  return text.replace(/^Source:.*?\n\n/, '').trim()
}
