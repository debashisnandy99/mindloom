import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import winston from "winston";
import { env, isDevelopment } from "../env.js";

const logDirectory = resolve(process.cwd(), "logs");
mkdirSync(logDirectory, { recursive: true });

/**
 * Dedicated S3 diagnostics. Keeps upload/download failures in a file the
 * operator can tail without digging through the general pino request log.
 */
export const s3Logger = winston.createLogger({
  level: isDevelopment ? "debug" : "info",
  defaultMeta: { service: "mindloom-s3", env: env.NODE_ENV },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: resolve(logDirectory, "s3-error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: resolve(logDirectory, "s3.log"),
      maxsize: 5_000_000,
    }),
  ],
  exitOnError: false,
});

function serializeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  const aws = error as Error & {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: {
      httpStatusCode?: number;
      requestId?: string;
      extendedRequestId?: string;
      attempts?: number;
      totalRetryDelay?: number;
    };
    $fault?: string;
  };

  return {
    name: aws.name,
    message: aws.message,
    stack: aws.stack,
    code: aws.Code ?? aws.code,
    fault: aws.$fault,
    httpStatusCode: aws.$metadata?.httpStatusCode,
    requestId: aws.$metadata?.requestId,
    extendedRequestId: aws.$metadata?.extendedRequestId,
    attempts: aws.$metadata?.attempts,
    cause: aws.cause instanceof Error ? aws.cause.message : aws.cause,
  };
}

/** Logs an S3 failure with the AWS error shape operators need to debug. */
export function logS3Failure(
  message: string,
  error: unknown,
  metadata: Record<string, unknown> = {},
): void {
  s3Logger.error(message, { ...metadata, error: serializeError(error) });
}
