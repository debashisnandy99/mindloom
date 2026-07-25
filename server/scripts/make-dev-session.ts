/**
 * Development helper: mints a signed session cookie for a throwaway user so
 * the authenticated API can be exercised without an OAuth round-trip.
 * Refuses to run outside development.
 */
import { randomUUID } from "node:crypto";
import signature from "cookie-signature";
import { prisma } from "../src/config/prisma.js";
import { redis } from "../src/config/redis.js";
import { env, isProduction } from "../src/env.js";

if (isProduction) {
  console.error("Refusing to mint a session in production");
  process.exit(1);
}

const email = process.argv[2] ?? "dev@mindloom.local";

const user = await prisma.user.upsert({
  where: { email },
  create: { email, name: "Dev User" },
  update: {},
});

const sid = randomUUID();
const maxAge = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

await redis.set(
  `mindloom:sess:${sid}`,
  JSON.stringify({
    cookie: {
      originalMaxAge: maxAge,
      expires: new Date(Date.now() + maxAge).toISOString(),
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    },
    passport: { user: user.id },
  }),
  "EX",
  Math.floor(maxAge / 1000),
);

const signed = `s:${signature.sign(sid, env.SESSION_SECRET)}`;

console.log(
  JSON.stringify({
    userId: user.id,
    email: user.email,
    cookie: `${env.SESSION_NAME}=${encodeURIComponent(signed)}`,
  }),
);

await redis.quit();
await prisma.$disconnect();
