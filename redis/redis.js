// config/redis.js
import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
  },
});

redis.on("error", (e) => console.error("❌ [Redis]", e.message));
redis.on("connect", () => console.log("✅ Redis connected"));

await redis.connect();

export default redis;

export const ODDS_TTL_MS = 2500;
export const ODDS_MAX_AGE_MS = 1500;
export const FANCY_TTL_MS = 4000;
export const FANCY_MAX_AGE_MS = 3000;
