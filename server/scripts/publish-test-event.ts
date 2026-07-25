/**
 * Development helper: publishes an indexing progress event from a separate
 * process, mimicking the BullMQ worker, to verify the SSE relay end to end.
 */
import { createPublisher, disconnectRedis } from "../src/config/redis.js";
import { notebookChannel } from "../src/services/sse/sse.service.js";
import type { IndexingProgressEvent } from "../src/types/indexing.js";

const [notebookId, stage = "embedding", progress = "50"] = process.argv.slice(2);

if (!notebookId) {
  console.error("Usage: tsx scripts/publish-test-event.ts <notebookId> [stage] [progress]");
  process.exit(1);
}

const event: IndexingProgressEvent = {
  sourceId: "11111111-1111-4111-8111-111111111111",
  notebookId,
  status: stage === "completed" ? "INDEXED" : "PROCESSING",
  stage: stage as IndexingProgressEvent["stage"],
  progress: Number(progress),
  chunkCount: 12,
  message: `test event: ${stage}`,
  at: new Date().toISOString(),
};

const publisher = createPublisher("test");
await publisher.publish(notebookChannel(notebookId), JSON.stringify(event));
await publisher.quit();

// Importing the redis config opens the shared app connection as a side
// effect, so it has to be closed for this script to exit.
await disconnectRedis();

console.log(`published ${stage} to ${notebookChannel(notebookId)}`);
