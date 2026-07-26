import type { Response } from "express";
import type { Redis } from "ioredis";
import { createPublisher, createSubscriber } from "../../config/redis.js";
import type { ToolGenerationEvent } from "../../types/generation.js";
import type { IndexingProgressEvent } from "../../types/indexing.js";
import { childLogger } from "../../utils/logger.js";

const log = childLogger("sse");

const CHANNEL_PREFIX = "indexing:notebook:";
const HEARTBEAT_MS = 30_000;

/**
 * A single Redis pub/sub channel per notebook carries both indexing and tool
 * generation updates. The envelope's `type` tells the subscriber which SSE
 * event name to emit so the client can route them independently.
 */
type NotebookMessage =
  | { type: "indexing"; event: IndexingProgressEvent }
  | { type: "tool"; event: ToolGenerationEvent };

export function notebookChannel(notebookId: string): string {
  return `${CHANNEL_PREFIX}${notebookId}`;
}

// ── Publisher side (used by the worker processes) ─────────────────────────

let publisher: Redis | undefined;

function publish(notebookId: string, message: NotebookMessage): Promise<number> {
  publisher ??= createPublisher("notebook");
  return publisher.publish(notebookChannel(notebookId), JSON.stringify(message));
}

export async function publishIndexingEvent(event: IndexingProgressEvent): Promise<void> {
  await publish(event.notebookId, { type: "indexing", event });
}

export async function publishToolEvent(event: ToolGenerationEvent): Promise<void> {
  await publish(event.notebookId, { type: "tool", event });
}

export async function closePublisher(): Promise<void> {
  if (!publisher) return;
  await publisher.quit().catch(() => publisher?.disconnect());
  publisher = undefined;
}

// ── Subscriber side (used by the API process) ─────────────────────────────

interface SseClient {
  id: string;
  res: Response;
}

const clientsByNotebook = new Map<string, Set<SseClient>>();
let subscriber: Redis | undefined;
let heartbeat: NodeJS.Timeout | undefined;

function write(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function ensureSubscriber(): Redis {
  if (subscriber) return subscriber;

  subscriber = createSubscriber("indexing");

  subscriber.on("message", (channel, payload) => {
    const notebookId = channel.slice(CHANNEL_PREFIX.length);
    const clients = clientsByNotebook.get(notebookId);
    if (!clients?.size) return;

    let message: NotebookMessage;
    try {
      message = JSON.parse(payload) as NotebookMessage;
    } catch (err) {
      log.warn({ err, channel }, "dropped malformed notebook event");
      return;
    }

    // The envelope's `type` doubles as the SSE event name.
    for (const client of clients) write(client.res, message.type, message.event);
  });

  heartbeat = setInterval(() => {
    for (const clients of clientsByNotebook.values()) {
      // A bare comment keeps proxies from closing an idle stream.
      for (const client of clients) client.res.write(": ping\n\n");
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  return subscriber;
}

/** Registers an open response as an SSE listener for one notebook. */
export async function addSseClient(notebookId: string, res: Response): Promise<void> {
  const redisSub = ensureSubscriber();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  const client: SseClient = { id: crypto.randomUUID(), res };

  let clients = clientsByNotebook.get(notebookId);
  if (!clients) {
    clients = new Set();
    clientsByNotebook.set(notebookId, clients);
    await redisSub.subscribe(notebookChannel(notebookId));
  }
  clients.add(client);

  write(res, "connected", { notebookId, at: new Date().toISOString() });
  log.debug({ notebookId, clients: clients.size }, "sse client connected");

  const cleanup = () => {
    const set = clientsByNotebook.get(notebookId);
    if (!set) return;
    set.delete(client);

    if (set.size === 0) {
      clientsByNotebook.delete(notebookId);
      void redisSub.unsubscribe(notebookChannel(notebookId));
    }
    log.debug({ notebookId, clients: set.size }, "sse client disconnected");
  };

  res.on("close", cleanup);
  res.on("error", cleanup);
}

export async function shutdownSse(): Promise<void> {
  if (heartbeat) clearInterval(heartbeat);

  for (const clients of clientsByNotebook.values()) {
    for (const client of clients) client.res.end();
  }
  clientsByNotebook.clear();

  if (subscriber) {
    await subscriber.quit().catch(() => subscriber?.disconnect());
    subscriber = undefined;
  }
  await closePublisher();
}
