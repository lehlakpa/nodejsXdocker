import { randomUUID } from "node:crypto";
import { redis } from "../config/redis.js";

export const CACHE_TTL_SECONDS = 60;

export function createCache(client, ttl = CACHE_TTL_SECONDS) {
  let bypassUntil = 0;
  const available = () => client.isReady && Date.now() >= bypassUntil;
  const commands = () => client.withCommandOptions({ timeout: 1000 });
  const revisionKey = (scope) => `node-auth:cache:v1:${scope}:revision`;
  const bypass = () => { bypassUntil = Date.now() + ttl * 1000; };

  return {
    async remember(scope, entry, load) {
      if (!available()) return load();
      let key;
      try {
        const revision = revisionKey(scope);
        await commands().set(revision, randomUUID(), { NX: true, EX: ttl * 2 });
        const version = await commands().get(revision);
        if (version === null) return load();
        key = `${revision}:${version}:${entry}`;
        const cached = await commands().get(key);
        if (cached !== null) return JSON.parse(cached);
      } catch {
        bypass();
        return load();
      }

      // Database errors must reach the normal API error handler.
      const value = await load();
      if (value !== null && value !== undefined && available()) {
        try {
          await commands().set(key, JSON.stringify(value), { EX: ttl });
        } catch {
          bypass();
        }
      }
      return value;
    },

    async invalidate(scope) {
      if (!client.isReady) {
        bypass();
        return;
      }
      try {
        // A new revision also isolates reads already in flight during a write.
        // Old entries expire automatically, without scanning Redis keys.
        await commands().set(revisionKey(scope), randomUUID(), { EX: ttl * 2 });
      } catch {
        bypass();
      }
    }
  };
}

export const cache = createCache(redis);
export const productCacheScope = (userId) => `products:${userId}`;
export const storefrontCacheScope = "storefront:products";
export const profileCacheScope = (userId) => `profile:${userId}`;
