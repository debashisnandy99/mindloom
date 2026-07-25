import { Queue } from "bullmq";
import { createQueueConnection } from "../../config/redis.js";
import { INDEXING_QUEUE, type IndexingJobData } from "../../types/indexing.js";

let queue: Queue<IndexingJobData> | undefined;

export function getIndexingQueue(): Queue<IndexingJobData> {
  queue ??= new Queue<IndexingJobData>(INDEXING_QUEUE, {
    connection: createQueueConnection("queue"),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 3600, count: 500 },
      removeOnFail: { age: 24 * 3600 },
    },
  });
  return queue;
}

export async function enqueueIndexingJob(data: IndexingJobData): Promise<string> {
  // The source id doubles as the job id, so a rapid re-index cannot
  // queue the same source twice.
  const job = await getIndexingQueue().add("index-source", data, { jobId: data.sourceId });
  return job.id ?? data.sourceId;
}

export async function removeIndexingJob(sourceId: string): Promise<void> {
  const job = await getIndexingQueue().getJob(sourceId);
  await job?.remove().catch(() => undefined);
}

export async function closeIndexingQueue(): Promise<void> {
  if (!queue) return;
  await queue.close();
  queue = undefined;
}
