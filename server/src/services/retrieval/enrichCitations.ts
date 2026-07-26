import { prisma } from "../../config/prisma.js";
import type { SourceType } from "../../generated/prisma/enums.js";
import type { RetrievedChunk } from "../../types/indexing.js";

function hostLabel(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function buildLabel(chunk: RetrievedChunk, sourceType: SourceType | undefined, content: string): string {
  const name = chunk.sourceName || "Source";

  if (sourceType === "YT") {
    const stamp =
      chunk.timestamp ??
      (typeof chunk.startSeconds === "number" ? formatSeconds(chunk.startSeconds) : undefined);
    return stamp ? `${name} · ${stamp}` : name;
  }

  if (sourceType === "PDF" && typeof chunk.pageNumber === "number") {
    return `${name} · p.${chunk.pageNumber}`;
  }

  if (sourceType === "URL" || sourceType === "GDOC") {
    const host = hostLabel(content);
    return host ? `${name} · ${host}` : name;
  }

  return name;
}

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/**
 * Attaches Source.content and human chip labels to retrieved chunks so the
 * client can open YouTube/PDF/URL viewers without a second round-trip.
 */
export async function enrichCitations(chunks: RetrievedChunk[]): Promise<RetrievedChunk[]> {
  if (chunks.length === 0) return chunks;

  const ids = [...new Set(chunks.map((c) => c.sourceId).filter(Boolean))];
  if (ids.length === 0) return chunks;

  const sources = await prisma.source.findMany({
    where: { id: { in: ids } },
    select: { id: true, type: true, content: true, name: true },
  });
  const byId = new Map(sources.map((s) => [s.id, s]));

  return chunks.map((chunk) => {
    const source = byId.get(chunk.sourceId);
    const sourceType = chunk.sourceType ?? source?.type;
    const contentUrl = source?.content ?? chunk.contentUrl;
    const sourceName = chunk.sourceName || source?.name || "Source";

    const enriched: RetrievedChunk = {
      ...chunk,
      sourceName,
      sourceType,
      contentUrl,
    };

    return {
      ...enriched,
      label: buildLabel(enriched, sourceType, contentUrl ?? ""),
    };
  });
}
