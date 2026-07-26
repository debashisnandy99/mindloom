import { type Job, Worker } from "bullmq";
import { connectDatabase, disconnectDatabase } from "../config/prisma.js";
import { createQueueConnection, disconnectRedis } from "../config/redis.js";
import { env } from "../env.js";
import { processIndexingJob } from "../services/indexing/processor.js";
import { processToolGenerationJob } from "../services/generation/processor.js";
import { requeueQueuedToolGenerations } from "../services/generation/regenerate.js";
import { closePublisher } from "../services/sse/sse.service.js";
import {
  TOOL_GENERATION_QUEUE,
  type ToolGenerationJobData,
} from "../types/generation.js";
import { INDEXING_QUEUE, type IndexingJobData } from "../types/indexing.js";
import { bullmqLogger, logBullMQFailure } from "../utils/bullmq.logger.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("worker");

let indexingWorker: Worker<IndexingJobData> | undefined;
let toolWorker: Worker<ToolGenerationJobData> | undefined;
let shuttingDown = false;

function toolJobMetadata(job: Job<ToolGenerationJobData> | undefined): Record<string, unknown> {
  return {
    queue: TOOL_GENERATION_QUEUE,
    jobId: job?.id,
    jobName: job?.name,
    attemptsMade: job?.attemptsMade,
    attempts: job?.opts.attempts,
    notebookId: job?.data.notebookId,
    kind: job?.data.kind,
    revision: job?.data.revision,
  };
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, "worker shutting down");

  try {
    // `close()` waits for in-flight jobs so a restart never loses work.
    await Promise.all([indexingWorker?.close(), toolWorker?.close()]);
    await closePublisher();
    await disconnectDatabase();
    await disconnectRedis();
  } catch (err) {
    log.error({ err }, "error during worker shutdown");
  }

  process.exit(0);
}

async function start(): Promise<void> {
  await connectDatabase();

  indexingWorker = new Worker<IndexingJobData>(
    INDEXING_QUEUE,
    async (job) => processIndexingJob(job.data),
    {
      connection: createQueueConnection("worker"),
      concurrency: env.INDEXING_CONCURRENCY,
    },
  );

  indexingWorker.on("completed", (job) => {
    log.info({ jobId: job.id, sourceId: job.data.sourceId }, "indexing job completed");
  });

  indexingWorker.on("failed", (job, err) => {
    log.error(
      { jobId: job?.id, sourceId: job?.data.sourceId, attempts: job?.attemptsMade, err },
      "indexing job failed",
    );
    logBullMQFailure("BullMQ indexing job failed", err, {
      queue: INDEXING_QUEUE,
      jobId: job?.id,
      sourceId: job?.data.sourceId,
      attemptsMade: job?.attemptsMade,
      attempts: job?.opts.attempts,
      failedReason: job?.failedReason,
    });
  });

  indexingWorker.on("error", (err) => {
    log.error({ err }, "indexing worker error");
    logBullMQFailure("BullMQ indexing worker error", err, { queue: INDEXING_QUEUE });
  });

  toolWorker = new Worker<ToolGenerationJobData>(
    TOOL_GENERATION_QUEUE,
    async (job) => processToolGenerationJob(job.data),
    {
      connection: createQueueConnection("tool-worker"),
      concurrency: env.TOOL_GENERATION_CONCURRENCY,
    },
  );

  toolWorker.on("completed", (job) => {
    log.info({ jobId: job.id, kind: job.data.kind }, "tool job completed");
    bullmqLogger.info("BullMQ tool job completed", toolJobMetadata(job));
  });

  toolWorker.on("active", (job, previous) => {
    bullmqLogger.info("BullMQ tool job started", {
      ...toolJobMetadata(job),
      previousState: previous,
    });
  });

  toolWorker.on("failed", (job, err, previous) => {
    log.error(
      { jobId: job?.id, kind: job?.data.kind, attempts: job?.attemptsMade, err },
      "tool job failed",
    );
    logBullMQFailure("BullMQ tool job failed", err, {
      ...toolJobMetadata(job),
      previousState: previous,
      failedReason: job?.failedReason,
    });
  });

  toolWorker.on("stalled", (jobId, previous) => {
    bullmqLogger.warn("BullMQ tool job stalled", {
      queue: TOOL_GENERATION_QUEUE,
      jobId,
      previousState: previous,
    });
  });
  toolWorker.on("lockRenewalFailed", (jobIds) => {
    bullmqLogger.warn("BullMQ tool job lock renewal failed", {
      queue: TOOL_GENERATION_QUEUE,
      jobIds,
    });
  });
  toolWorker.on("error", (err) => {
    log.error({ err }, "tool worker error");
    logBullMQFailure("BullMQ tool worker error", err, { queue: TOOL_GENERATION_QUEUE });
  });

  const recoveredJobs = await requeueQueuedToolGenerations();
  bullmqLogger.info("BullMQ tool queue recovery completed", {
    queue: TOOL_GENERATION_QUEUE,
    recoveredJobs,
  });

  log.info(
    {
      indexingConcurrency: env.INDEXING_CONCURRENCY,
      toolConcurrency: env.TOOL_GENERATION_CONCURRENCY,
    },
    "workers ready",
  );
  bullmqLogger.info("BullMQ workers ready", {
    indexingQueue: INDEXING_QUEUE,
    indexingConcurrency: env.INDEXING_CONCURRENCY,
    toolQueue: TOOL_GENERATION_QUEUE,
    toolConcurrency: env.TOOL_GENERATION_CONCURRENCY,
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

start().catch((err) => {
  log.fatal({ err }, "failed to start indexing worker");
  logBullMQFailure("BullMQ worker startup failed", err);
  process.exit(1);
});
