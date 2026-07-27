import { useEffect, useRef, type KeyboardEvent } from "react";
import type {
  ChatQuery,
  QueryToSource,
  RetrievedChunk,
  ServerSourceType,
} from "../../../api/types";
import { Icon } from "../../../components/Icon";
import { AnswerMarkdown } from "./AnswerMarkdown";
import { chunkToLocator } from "./citations";
import { useChatHistory } from "../../../hooks/queries/useChatHistory";
import { useSources } from "../../../hooks/queries/useSources";
import { useSuggestions } from "../../../hooks/queries/useSuggestions";
import { useStreamingAnswer } from "../../../hooks/mutations/useStreamingAnswer";
import { useAppDispatch, useAppSelector } from "../../../store/reduxStore";
import { clearDraft, setDraft } from "../../../store/slices/chatSlice";
import {
  openCitation,
  type CitationLocator,
} from "../../../store/slices/sourcesSlice";
import { useNotebookId } from "../WorkspaceContext";
import "./ChatView.scss";

interface CiteChip {
  key: string;
  label: string;
  locator: CitationLocator;
}

export function ChatView() {
  const notebookId = useNotebookId();
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.chat.draft);

  const { data: history = [] } = useChatHistory(notebookId);
  const { data: sources = [] } = useSources(notebookId);
  const readyCount = sources.filter((s) => s.status === "INDEXED").length;
  const hasIndexedData = readyCount > 0;

  // Suggestions only load once there is indexed data; the query fires
  // automatically when indexing completes and `hasIndexedData` flips true.
  const {
    data: allSuggestions = [],
    isLoading: sugLoading,
    isFetching: sugFetching,
    refresh: refreshSuggestions,
  } = useSuggestions(notebookId, hasIndexedData);
  const {
    query,
    answer,
    citations,
    grounded,
    isStreaming,
    error,
    ask,
    completedQueryId,
  } = useStreamingAnswer(notebookId);

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, answer, isStreaming]);

  const suggestions = allSuggestions.slice(0, 3);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || isStreaming) return;
    dispatch(clearDraft());
    void ask(t);
  };

  // Each click pulls a brand-new batch, excluding the ones on screen now.
  const shuffle = () => {
    if (sugFetching) return;
    void refreshSuggestions();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") send(draft);
  };

  const openCite = (locator: CitationLocator) => {
    dispatch(openCitation(locator));
  };

  // showLive stays true until the completed query actually appears in the history array
  const showLive =
    isStreaming ||
    (Boolean(query) &&
      (!completedQueryId || !history.some((t) => t.id === completedQueryId)));
  const empty = history.length === 0 && !showLive;
  const liveCites = grounded === false ? [] : chunksToChips(citations);

  return (
    <>
      <div ref={logRef} className="chat-view__log">
        {empty && (
          <div className="chat-view__empty" style={emptyStyle}>
            {readyCount === 0
              ? "Add and index a source, then ask anything — every answer cites the passage it came from."
              : `${readyCount} ${readyCount === 1 ? "source is" : "sources are"} ready. Ask anything — answers cite the exact passage.`}
          </div>
        )}

        {history.map((turn) => (
          <HistoryTurn key={turn.id} turn={turn} onOpenCite={openCite} />
        ))}

        {showLive && query && (
          <div className="chat-view__bubble--user">{query}</div>
        )}

        {showLive && (isStreaming || answer) && (
          <BotBubble
            text={answer}
            streaming={isStreaming}
            cites={liveCites}
            indexedCitations={citations}
            onOpenCite={openCite}
          />
        )}

        {showLive && error && (
          <div
            className="chat-view__empty"
            style={{ ...emptyStyle, color: "var(--red)" }}
          >
            {error}
          </div>
        )}
      </div>

      {hasIndexedData && (
        <div className="chat-view__suggestions">
          <span
            title="Suggested for you"
            className="chat-view__suggestions--icon"
          >
            <Icon
              d="M12 4l1.6 5.2L19 11l-5.4 1.8L12 18l-1.6-5.2L5 11l5.4-1.8z"
              size={15}
              fill="var(--acc)"
              stroke="none"
            />
          </span>
          {sugLoading || sugFetching
            ? [100, 140, 120].map((w, i) => (
                <span
                  key={i}
                  className="chat-view__suggestions--skeleton"
                  style={{ width: w }}
                />
              ))
            : suggestions.map((text, i) => (
                <button
                  key={i}
                  onClick={() => send(text)}
                  className="chat-view__suggestions--btn ml-sug"
                >
                  {text}
                </button>
              ))}
          <button
            onClick={shuffle}
            title="More suggestions"
            disabled={sugLoading || sugFetching}
            className="chat-view__suggestions--shuffle ml-hov-acc ml-press"
          >
            <Icon
              d="M4 12a8 8 0 0 1 14-5.2M20 12a8 8 0 0 1-14 5.2M18 3v4h-4M6 21v-4h4"
              size={13}
              sw={2.2}
            />
          </button>
        </div>
      )}

      <div className="chat-view__composer">
        <input
          value={draft}
          onChange={(e) => dispatch(setDraft(e.target.value))}
          onKeyDown={onKey}
          placeholder={
            isStreaming ? "Answering…" : "Ask across all ready sources…"
          }
          disabled={isStreaming}
          className={`chat-view__composer--input ${isStreaming ? "chat-view__composer--input-streaming" : ""}`}
        />
        <button
          onClick={() => send(draft)}
          title="Send"
          disabled={isStreaming || !draft.trim()}
          className={`chat-view__composer--send ml-lift ml-press-flat ${isStreaming ? "chat-view__composer--send-streaming" : ""}`}
        >
          {isStreaming ? (
            <div className="chat-view__composer--spinner" />
          ) : (
            <Icon d="M5 12h13M13 6l6 6-6 6" size={19} sw={2.4} />
          )}
        </button>
      </div>
    </>
  );
}

const emptyStyle = {
  padding: "18px 20px",
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--tx2)",
  textAlign: "center" as const,
};

/** One chip per source, keeping the best-scoring chunk's locator. */
function chunksToChips(citations: RetrievedChunk[]): CiteChip[] {
  const best = new Map<string, RetrievedChunk>();
  for (const c of citations) {
    if (!c.sourceId) continue;
    const existing = best.get(c.sourceId);
    if (!existing || c.score > existing.score) best.set(c.sourceId, c);
  }

  return [...best.values()].flatMap((c, i) => {
    const locator = chunkToLocator(c);
    if (!locator) return [];
    return [
      {
        key: `${c.sourceId}-${i}`,
        label: c.label || c.sourceName,
        locator,
      },
    ];
  });
}

function historyToChips(links: QueryToSource[]): CiteChip[] {
  return links.flatMap((qs, i) => {
    const sourceType = (qs.sourceType ?? qs.source?.type) as
      ServerSourceType | undefined;
    if (!qs.sourceId || !sourceType) return [];
    const label = qs.label || qs.source?.name || "Source";
    return [
      {
        key: qs.id || `${qs.sourceId}-${i}`,
        label,
        locator: {
          sourceId: qs.sourceId,
          sourceType,
          contentUrl: qs.contentUrl ?? qs.source?.content,
          timestamp: qs.timestamp ?? undefined,
          startSeconds: qs.startSeconds ?? undefined,
          pageNumber: qs.pageNumber ?? undefined,
          chunkText: qs.chunkText ?? undefined,
          label,
        },
      },
    ];
  });
}

function HistoryTurn({
  turn,
  onOpenCite,
}: {
  turn: ChatQuery;
  onOpenCite: (locator: CitationLocator) => void;
}) {
  const cites = historyToChips(turn.queryToSources);
  // Indexed list matching [1]..[n] order for inline markers (best-effort from links).
  const indexed = turn.queryToSources.map((qs) => ({
    sourceId: qs.sourceId,
    sourceName: qs.source?.name ?? qs.label ?? "Source",
    sourceType: (qs.sourceType ?? qs.source?.type) as
      ServerSourceType | undefined,
    contentUrl: qs.contentUrl ?? qs.source?.content ?? undefined,
    timestamp: qs.timestamp ?? undefined,
    startSeconds: qs.startSeconds ?? undefined,
    pageNumber: qs.pageNumber ?? undefined,
    text: qs.chunkText ?? "",
    label: qs.label ?? qs.source?.name,
    score: qs.score ?? 0,
    chunkIndex: qs.chunkIndex ?? 0,
    id: qs.id,
  })) satisfies RetrievedChunk[];

  return (
    <>
      <div className="chat-view__bubble--user">{turn.query}</div>
      {turn.answer && (
        <BotBubble
          text={turn.answer}
          streaming={false}
          cites={cites}
          indexedCitations={indexed}
          onOpenCite={onOpenCite}
        />
      )}
    </>
  );
}

function BotBubble({
  text,
  streaming,
  cites,
  indexedCitations,
  onOpenCite,
}: {
  text: string;
  streaming: boolean;
  cites: CiteChip[];
  indexedCitations: RetrievedChunk[];
  onOpenCite: (locator: CitationLocator) => void;
}) {
  return (
    <div className="chat-view__bubble--bot">
      <div className="chat-view__bubble--bot-avatar">
        <Icon d="M4 9h16M4 15h16M9 4v16M15 4v16" size={14} sw={2.2} />
      </div>
      <div className="chat-view__bubble--bot-body">
        <AnswerMarkdown
          text={text}
          citations={indexedCitations}
          onOpenCite={onOpenCite}
        />
        {streaming && <span className="chat-view__bubble--bot-caret">▌</span>}
        {cites.length > 0 && (
          <span className="chat-view__bubble--bot-cites">
            {cites.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => onOpenCite(c.locator)}
                title={c.label}
                className="chat-view__bubble--bot-cite-btn ml-cite"
              >
                {c.label}
              </button>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
