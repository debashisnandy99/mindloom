import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import hpp from "hpp";
import { pinoHttp } from "pino-http";
import { passport } from "./config/passport.js";
import { sessionMiddleware } from "./config/session.js";
import { env } from "./env.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { notFoundHandler } from "./middlewares/notFound.middleware.js";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";
import routes from "./routes/index.js";
import { logger } from "./utils/logger.js";

export function createApp(): Express {
  const app = express();

  // Required for secure cookies and correct client IPs behind a proxy.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      // The API serves JSON and SSE only; CSP belongs to the client app.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
      exposedHeaders: ["X-CSRF-Token"],
    }),
  );

  app.use(
    compression({
      // Compressing an SSE stream buffers it and breaks live delivery.
      filter: (req, res) =>
        res.getHeader("Content-Type") === "text/event-stream"
          ? false
          : compression.filter(req, res),
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(hpp());

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === "/health" },
    }),
  );

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.use("/api/v1", apiLimiter, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
