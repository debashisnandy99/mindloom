import OpenAI from "openai";
import { env } from "../../env.js";
import type { RewrittenQuery } from "../../types/indexing.js";
import { childLogger } from "../../utils/logger.js";

const log = childLogger("rewriter");

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 2 });

/**
 * Two rewrites, both aimed at recall rather than readability:
 *
 * - `rephrased` restates the question in the declarative vocabulary a document
 *   would actually use, which embeds closer to source prose than a question does.
 * - `stepBack` asks the broader conceptual question behind it, so a narrow ask
 *   ("why did my loss spike at epoch 30?") can still match general material
 *   ("learning-rate schedules and divergence").
 *
 * Both are internal retrieval aids and are never returned to the client.
 */
const SYSTEM_PROMPT = `You rewrite a user's question to improve vector search over their own documents.

Return JSON with exactly two string fields:
- "rephrased": the same question restated as a declarative statement using the formal vocabulary a textbook, paper, or transcript would use. Keep every specific entity, name, and number from the original.
- "stepBack": one broader question about the general concept or category the original question belongs to.

Rules:
- Never answer the question.
- Never invent facts, entities, or numbers that are not in the original.
- If the question is already broad, make "stepBack" a near-restatement.
- Keep each field under 240 characters and in the original language.`;

/** Fallback used whenever the rewrite is unavailable — retrieval still runs. */
function identity(query: string): RewrittenQuery {
  return { original: query, rephrased: query, stepBack: query };
}

function clean(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 400) : fallback;
}

/**
 * Produces the hidden rewrite variants. Deliberately fail-open: if the model
 * errors, times out, or returns malformed JSON, retrieval proceeds with the
 * original query rather than failing the user's request.
 */
export async function rewriteQuery(query: string): Promise<RewrittenQuery> {
  const original = query.trim();
  if (!original) return identity(original);

  try {
    const response = await openai.chat.completions.create({
      model: env.QUERY_REWRITE_MODEL,
      temperature: 0,
      max_completion_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: original },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return identity(original);

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const rewrite: RewrittenQuery = {
      original,
      rephrased: clean(parsed.rephrased, original),
      stepBack: clean(parsed.stepBack, original),
    };

    log.debug({ rewrite }, "rewrote query for retrieval");
    return rewrite;
  } catch (err) {
    log.warn({ err }, "query rewrite failed, falling back to the original query");
    return identity(original);
  }
}

/** The distinct, non-empty strings to embed — duplicates waste an embedding call. */
export function rewriteVariants(rewrite: RewrittenQuery): string[] {
  const seen = new Set<string>();
  for (const variant of [rewrite.original, rewrite.rephrased, rewrite.stepBack]) {
    const trimmed = variant.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}
