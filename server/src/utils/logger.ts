import pino from "pino";
import { env, isDevelopment } from "../env.js";

export const logger = pino({
  level: isDevelopment ? "debug" : "info",
  base: { env: env.NODE_ENV },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.password",
      "*.accessToken",
      "*.refreshToken",
    ],
    censor: "[redacted]",
  },
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname,env" },
      }
    : undefined,
});

export function childLogger(name: string) {
  return logger.child({ scope: name });
}
