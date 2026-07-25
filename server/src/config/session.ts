import { RedisStore } from "connect-redis";
import session from "express-session";
import { env, isProduction } from "../env.js";
import { redis } from "./redis.js";

const maxAge = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const sessionMiddleware = session({
  name: env.SESSION_NAME,
  secret: env.SESSION_SECRET,
  store: new RedisStore({ client: redis, prefix: "mindloom:sess:", ttl: maxAge / 1000 }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    // 'lax' lets the session cookie survive the OAuth provider redirect back to us.
    sameSite: isProduction ? "none" : "lax",
    maxAge,
    path: "/",
  },
});
