import OpenAI from "openai";
import { env } from "../../env.js";
import { childLogger } from "../../utils/logger.js";

const log = childLogger("embedder");

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 3 });

/**
 * Embeds texts with `text-embedding-3-large`, batched to stay inside the
 * per-request token ceiling.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += env.EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + env.EMBEDDING_BATCH_SIZE);

    const response = await openai.embeddings.create({
      model: env.EMBEDDING_MODEL,
      input: batch,
      dimensions: env.EMBEDDING_DIMENSIONS,
    });

    // The API may return items out of order, so sort by index before pushing.
    const ordered = [...response.data].sort((a, b) => a.index - b.index);
    vectors.push(...ordered.map((d) => d.embedding));

    log.debug({ batch: batch.length, total: texts.length }, "embedded batch");
  }

  return vectors;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
