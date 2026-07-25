import type { Server } from "node:http";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/prisma.js";
import { disconnectRedis } from "./config/redis.js";
import { env } from "./env.js";
import { closeIndexingQueue } from "./services/indexing/queue.js";
import { shutdownSse } from "./services/sse/sse.service.js";
import { logger } from "./utils/logger.js";

let server: Server | undefined;
let shuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");

  const forceExit = setTimeout(() => {
    logger.error("graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await shutdownSse();
    await closeIndexingQueue();
    await disconnectDatabase();
    await disconnectRedis();
    logger.info("shutdown complete");
  } catch (err) {
    logger.error({ err }, "error during shutdown");
    exitCode = 1;
  }

  clearTimeout(forceExit);
  process.exit(exitCode);
}

async function start(): Promise<void> {
  await connectDatabase();
  logger.info("database connected");

  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(`Mindloom API listening on http://localhost:${env.PORT}`);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandled rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception");
  void shutdown("uncaughtException", 1);
});

start().catch((err) => {
  logger.fatal({ err }, "failed to start server");
  process.exit(1);
});
