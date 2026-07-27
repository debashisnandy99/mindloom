import {
  Children,
  isValidElement,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import type { RetrievedChunk } from "../../../api/types";
import type { CitationLocator } from "../../../store/slices/sourcesSlice";
import { chunkToLocator } from "./citations";
import "./AnswerMarkdown.scss";

// ── Citation rehype plugin ────────────────────────────────────────────────
// The model marks citations as `[1]`, `[2]` … inline in the answer. We rewrite
// those text runs into <cite data-cite-index="n"> nodes so they can render as
// clickable chips anywhere in the markdown — but never inside code/pre.

interface MdNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: MdNode[];
}

const HAS_CITE = /\[\d+\]/;
const CITE_SPLIT = /(\[\d+\])/g;
const CITE_ONE = /^\[(\d+)\]$/;

function transformCites(node: MdNode): void {
  if (!node.children) return;
  const out: MdNode[] = [];

  for (const child of node.children) {
    if (child.type === "text" && child.value && HAS_CITE.test(child.value)) {
      for (const part of child.value.split(CITE_SPLIT)) {
        if (!part) continue;
        const m = CITE_ONE.exec(part);
        if (m) {
          out.push({
            type: "element",
            tagName: "cite",
            properties: { "data-cite-index": m[1] },
            children: [{ type: "text", value: part }],
          });
        } else {
          out.push({ type: "text", value: part });
        }
      }
      continue;
    }

    // Leave literal `[1]` inside code samples alone.
    if (child.tagName !== "code" && child.tagName !== "pre")
      transformCites(child);
    out.push(child);
  }

  node.children = out;
}

function rehypeCitations() {
  return (tree: MdNode) => transformCites(tree);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function toText(node: ReactNode): string {
  if (node == null || node === false || node === true) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (isValidElement(node))
    return toText((node.props as { children?: ReactNode }).children);
  return "";
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CiteRef({
  index,
  citations,
  onOpenCite,
  children,
}: {
  index: number;
  citations: RetrievedChunk[];
  onOpenCite: (locator: CitationLocator) => void;
  children: ReactNode;
}) {
  const chunk = citations[index - 1];
  const locator = chunk ? chunkToLocator(chunk) : null;

  if (!locator) {
    return (
      <span className="answer-md__cite answer-md__cite--dead">{children}</span>
    );
  }

  return (
    <button
      type="button"
      className="answer-md__cite ml-cite"
      title={locator.label ?? chunk.sourceName}
      onClick={() => onOpenCite(locator)}
    >
      {children}
    </button>
  );
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const codeEl = Children.toArray(children).find(isValidElement) as
    ReactElement<{ className?: string; children?: ReactNode }> | undefined;

  const className = codeEl?.props?.className ?? "";
  const lang = /language-([\w+-]+)/.exec(className)?.[1] ?? "";
  const raw = toText(codeEl?.props?.children).replace(/\n$/, "");

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); ignore.
    }
  };

  return (
    <div className="answer-md__code">
      <div className="answer-md__code-bar">
        <span className="answer-md__code-lang">{lang || "code"}</span>
        <button type="button" className="answer-md__code-copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="answer-md__code-pre">
        <code className={className}>{codeEl?.props?.children}</code>
      </pre>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export function AnswerMarkdown({
  text,
  citations,
  onOpenCite,
}: {
  text: string;
  citations: RetrievedChunk[];
  onOpenCite: (locator: CitationLocator) => void;
}) {
  const components = useMemo<Components>(
    () => ({
      cite: ({ children, node }) => {
        const raw = (node?.properties?.dataCiteIndex ??
          node?.properties?.["data-cite-index"]) as string | undefined;
        const index = Number(raw);
        if (!Number.isFinite(index)) return <>{children}</>;
        return (
          <CiteRef index={index} citations={citations} onOpenCite={onOpenCite}>
            {children}
          </CiteRef>
        );
      },
      a: ({ children, href }) => (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ),
      pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
      table: ({ children }) => (
        <div className="answer-md__table-wrap">
          <table>{children}</table>
        </div>
      ),
    }),
    [citations, onOpenCite],
  );

  return (
    <div className="answer-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeCitations,
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
