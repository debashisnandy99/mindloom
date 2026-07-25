import { Worker } from "bullmq";
import { connectDatabase, disconnectDatabase } from "../config/prisma.js";
import { createQueueConnection, disconnectRedis } from "../config/redis.js";
import { env } from "../env.js";
import { processIndexingJob } from "../services/indexing/processor.js";
import { closePublisher } from "../services/sse/sse.service.js";
import { INDEXING_QUEUE, type IndexingJobData } from "../types/indexing.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("worker");

let worker: Worker<IndexingJobData> | undefined;
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, "worker shutting down");

  try {
    // `close()` waits for in-flight jobs so a restart never loses work.
    await worker?.close();
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

  worker = new Worker<IndexingJobData>(
    INDEXING_QUEUE,
    async (job) => processIndexingJob(job.data),
    {
      connection: createQueueConnection("worker"),
      concurrency: env.INDEXING_CONCURRENCY,
    },
  );

  worker.on("completed", (job) => {
    log.info({ jobId: job.id, sourceId: job.data.sourceId }, "job completed");
  });

  worker.on("failed", (job, err) => {
    log.error(
      { jobId: job?.id, sourceId: job?.data.sourceId, attempts: job?.attemptsMade, err },
      "job failed",
    );
  });

  worker.on("error", (err) => log.error({ err }, "worker error"));

  log.info(
    { queue: INDEXING_QUEUE, concurrency: env.INDEXING_CONCURRENCY },
    "indexing worker ready",
  );
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

start().catch((err) => {
  log.fatal({ err }, "failed to start indexing worker");
  process.exit(1);
});
