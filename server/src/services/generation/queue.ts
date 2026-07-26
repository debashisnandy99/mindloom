import { Queue } from "bullmq";
import { createQueueConnection } from "../../config/redis.js";
import {
  TOOL_GENERATION_QUEUE,
  type ToolGenerationJobData,
} from "../../types/generation.js";
import { bullmqLogger, logBullMQFailure } from "../../utils/bullmq.logger.js";

let queue: Queue<ToolGenerationJobData> | undefined;

export function getToolGenerationQueue(): Queue<ToolGenerationJobData> {
  queue ??= new Queue<ToolGenerationJobData>(TOOL_GENERATION_QUEUE, {
    connection: createQueueConnection("tool-queue"),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 4_000 },
      removeOnComplete: { age: 3600, count: 200 },
      removeOnFail: { age: 24 * 3600 },
    },
  });
  queue.on("error", (error) =>
    logBullMQFailure("BullMQ tool queue error", error, { queue: TOOL_GENERATION_QUEUE }),
  );
  return queue;
}

/**
 * Enqueues one tool generation. Every revision needs its own BullMQ job id:
 * reusing an id after a completed, failed, or active job makes BullMQ return
 * the old job instead of scheduling fresh work. Pending older revisions are
 * removed, while an active job is allowed to finish and self-discard as stale.
 */
export async function enqueueToolGeneration(
  data: ToolGenerationJobData,
): Promise<string> {
  const jobId = `${data.notebookId}_${data.kind}_${data.revision}`;
  const q = getToolGenerationQueue();

  try {
    const pendingJobs = await q.getJobs(["waiting", "delayed", "prioritized"]);
    const supersededJobs = pendingJobs.filter(
      (job) =>
        job.data.notebookId === data.notebookId &&
        job.data.kind === data.kind &&
        job.data.revision < data.revision,
    );

    await Promise.all(
      supersededJobs.map(async (job) => {
        await job.remove();
        bullmqLogger.info("Removed superseded BullMQ tool job", {
          queue: TOOL_GENERATION_QUEUE,
          jobId: job.id,
          notebookId: data.notebookId,
          kind: data.kind,
          revision: job.data.revision,
        });
      }),
    );

    const job = await q.add("generate-tool", data, { jobId });
    bullmqLogger.info("Enqueued BullMQ tool job", {
      queue: TOOL_GENERATION_QUEUE,
      jobId: job.id,
      notebookId: data.notebookId,
      kind: data.kind,
      revision: data.revision,
      removedSupersededJobs: supersededJobs.length,
    });
    return job.id ?? jobId;
  } catch (error) {
    logBullMQFailure("Failed to enqueue BullMQ tool job", error, {
      queue: TOOL_GENERATION_QUEUE,
      jobId,
      notebookId: data.notebookId,
      kind: data.kind,
      revision: data.revision,
    });
    throw error;
  }
}

export async function closeToolGenerationQueue(): Promise<void> {
  if (!queue) return;
  await queue.close();
  queue = undefined;
}
