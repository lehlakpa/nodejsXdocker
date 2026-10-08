# Redis cache

The main application (`npm start`, using `server.js`) caches authenticated product
lists, individual products and `/api/auth/me` for 60 seconds. Keys include the
authenticated user's ID. Passwords, refresh-token hashes, login and token responses
are not cached. Response bodies and authentication requirements are unchanged.

Product create/update/delete operations invalidate that owner's product cache.
Login, token refresh and logout invalidate the user's profile cache. Revision keys
prevent a read already in progress from repopulating the current cache after a write.
All Redis keys expire. Changes made directly in MongoDB can remain cached for up to
60 seconds.

## Local development

Start Docker Desktop and wait for its engine to run, then:

```powershell
docker compose up -d redis
docker compose exec redis redis-cli ping
```

The ping command should return `PONG`. In `.env`, use:

```dotenv
REDIS_URL=redis://127.0.0.1:6379
```

Keep the existing MongoDB and authentication settings, then run `npm start`.
`server.js` already loads `.env`. `server.cjs` remains a separate demo.

When running the app in Docker Compose, `REDIS_URL=redis://redis:6379` is set by
Compose. Do not run a second Redis container on the same host port.

## Redis outages

Redis connects in the background and retries every five seconds. If Redis is
unavailable or a cache command fails, requests use MongoDB. Commands time out after
one second and are not queued while disconnected. A failed invalidation makes that
app process bypass cached reads/writes for 60 seconds. Other app instances may
still serve an existing entry until its TTL expires during a Redis failure; this
cache provides bounded staleness, not transactional consistency with MongoDB.

## Verification

`npm test` runs the API and cache tests with mocked database/Redis operations. They
cover hits, expiry, owner isolation, CRUD invalidation, concurrent reads, profile
projection, and Redis failure fallback. Live MongoDB/Redis integration requires
those services to be running.
