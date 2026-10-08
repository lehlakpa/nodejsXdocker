import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  disableOfflineQueue: true,
  socket: {
    connectTimeout: 2000,
    reconnectStrategy: () => 5000
  }
});

let reportedUnavailable = false;
redis.on("error", (error) => {
  if (!reportedUnavailable) {
    console.warn(`Redis unavailable (${error.code || error.message}); using MongoDB without cache.`);
    reportedUnavailable = true;
  }
});
redis.on("ready", () => {
  reportedUnavailable = false;
  console.log("Redis cache connected");
});

// Redis is optional: connecting/reconnecting must not block HTTP startup.
export const connectRedis = () => {
  if (!redis.isOpen) {
    void redis.connect().catch(() => {
      console.warn("Redis connection stopped; using MongoDB without cache.");
    });
  }
};

export const closeRedis = () => {
  if (redis.isOpen) redis.destroy();
};
