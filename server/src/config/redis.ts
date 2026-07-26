import { Redis, type RedisOptions } from "ioredis";
import { createClient } from "redis";
import { env } from "../env.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("redis");

/**
 * BullMQ requires `maxRetriesPerRequest: null` on the connections it owns,
 * so queue/worker connections are created separately from the app connection.
 */
const baseOptions: RedisOptions = {
  lazyConnect: false,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 200, 5_000),
};

function create(name: string, options: RedisOptions = {}): Redis {
  const client = new Redis(env.REDIS_URL, { ...baseOptions, ...options });
  client.on("error", (err) => log.error({ err, client: name }, "redis error"));
  client.on("connect", () => log.debug({ client: name }, "redis connected"));
  return client;
}

/** Shared ioredis connection used for general commands. */
export const redis = create("app");

/**
 * `connect-redis` v10 uses the node-redis command API, which differs from
 * ioredis for commands such as SET with an expiry. Keep this client dedicated
 * to sessions while BullMQ and pub/sub continue using ioredis connections.
 */
export const sessionRedis = createClient({ url: env.REDIS_URL });
sessionRedis.on("error", (err) => log.error({ err, client: "session" }, "redis error"));
sessionRedis.on("connect", () => log.debug({ client: "session" }, "redis connected"));

export async function connectRedis(): Promise<void> {
  if (!sessionRedis.isOpen) await sessionRedis.connect();
}

/** Connection factory for BullMQ queues and workers. */
export function createQueueConnection(name: string): Redis {
  return create(name, { maxRetriesPerRequest: null });
}

/**
 * A Redis connection in subscriber mode cannot issue normal commands,
 * so publishers and subscribers each need their own connection.
 */
export function createSubscriber(name: string): Redis {
  return create(`sub:${name}`);
}

export function createPublisher(name: string): Redis {
  return create(`pub:${name}`);
}

export async function disconnectRedis(): Promise<void> {
  await Promise.all([
    redis.quit().catch(() => redis.disconnect()),
    sessionRedis.isOpen ? sessionRedis.close().catch(() => sessionRedis.disconnect()) : undefined,
  ]);
}
