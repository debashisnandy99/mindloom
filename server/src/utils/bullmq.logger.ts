import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import winston from "winston";
import { env, isDevelopment } from "../env.js";

const logDirectory = resolve(process.cwd(), "logs");
mkdirSync(logDirectory, { recursive: true });

/**
 * Dedicated BullMQ diagnostics. The normal application logger stays on pino,
 * while this logger retains queue/worker failures with the job context needed
 * to diagnose them after a process restart.
 */
export const bullmqLogger = winston.createLogger({
  level: isDevelopment ? "debug" : "info",
  defaultMeta: { service: "mindloom-worker", env: env.NODE_ENV },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: resolve(logDirectory, "bullmq-error.log"),
      level: "error",
    }),
    new winston.transports.File({ filename: resolve(logDirectory, "bullmq.log"), maxsize: 5_000_000 }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: resolve(logDirectory, "bullmq-exceptions.log") }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: resolve(logDirectory, "bullmq-rejections.log") }),
  ],
  exitOnError: false,
});

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause instanceof Error ? error.cause.message : error.cause,
    };
  }

  return { message: String(error) };
}

/** Logs an error without losing its stack or the BullMQ job metadata. */
export function logBullMQFailure(
  message: string,
  error: unknown,
  metadata: Record<string, unknown> = {},
): void {
  bullmqLogger.error(message, { ...metadata, error: serializeError(error) });
}
