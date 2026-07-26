import "dotenv/config";
import { z } from "zod";

const booleanish = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_URL: z.url().default("http://localhost:5173"),
  SERVER_URL: z.url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  COOKIE_SECRET: z
    .string()
    .min(32, "COOKIE_SECRET must be at least 32 characters"),
  SESSION_NAME: z.string().default("mindloom.sid"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.url(),

  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.url(),

  OPENAI_API_KEY: z.string().min(1),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-large"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(3072),
  EMBEDDING_BATCH_SIZE: z.coerce.number().int().positive().default(64),

  /** Small, cheap model used only to rewrite the query before retrieval. */
  QUERY_REWRITE_MODEL: z.string().default("gpt-4o-mini"),

  /** OpenAI model used to generate the study tools (structured output). */
  TOOL_GENERATION_MODEL: z.string().default("gpt-4o-mini"),
  /** Concurrent tool-generation jobs per worker process. */
  TOOL_GENERATION_CONCURRENCY: z.coerce.number().int().positive().default(2),
  /** Max characters of source context fed to the generator. */
  TOOL_CONTEXT_BUDGET: z.coerce.number().int().positive().default(24_000),

  // ── Answer generation (xAI / Grok) ──────────────────────────────────────
  // Optional so the server still boots without it; the retrieval endpoints
  // fail with a clear message instead of crashing at startup.
  XAI_API_KEY: z.string().optional(),
  XAI_MODEL: z.string().default("grok-4.5"),
  XAI_BASE_URL: z.string().optional(),

  // ── Retrieval tuning ────────────────────────────────────────────────────
  /** Chunks handed to the generator after fusion. */
  RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(8),
  /** Per-query candidates pulled from Qdrant before fusion. */
  RETRIEVAL_CANDIDATES: z.coerce.number().int().positive().default(12),
  /**
   * Minimum cosine similarity for a chunk to count as relevant. Below this the
   * answer is refused as "not in your sources" rather than hallucinated.
   */
  RETRIEVAL_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.25),

  CHUNK_SIZE: z.coerce.number().int().positive().default(1000),
  CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(200),

  QDRANT_URL: z.url().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().optional(),

  AWS_REGION: z.string().default("ap-south-1"),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),

  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(25),
  INDEXING_CONCURRENCY: z.coerce.number().int().positive().default(3),
  ENABLE_CSRF: booleanish,
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
