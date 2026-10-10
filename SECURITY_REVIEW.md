# Security and performance review — 2026-10-10

## Verified and changed

- Closed public admin registration by default. Existing accounts continue to work. The customer storefront remains public. Product/order mutations remain scoped to the signed-in owner.
- Added IP-based login throttling, payment-verification throttling, request-origin checks for browser writes, SameSite=Lax cookies, response hardening and a 32 KB JSON limit. Production cookie writes without an Origin/Referer are rejected. JWT verification permits HS256 only. Cookie lifetimes now follow the signed token expiry.
- Refresh-token rotation uses an atomic compare-and-update so concurrent refreshes cannot both overwrite the session. Password hashing remains bcrypt; newly provisioned passwords require 12 characters and are bounded to bcrypt's 72-byte limit. Existing passwords were not changed.
- Production startup rejects weak/identical JWT secrets, HTTP client origins, open registration and eSewa test configuration. This is a guardrail, not an audit of secret entropy or TLS termination.
- Product uploads stay authenticated, allow at most three JPG/PNG/WebP files of 5 MB each, are validated by Cloudinary, and are capped at four concurrent multipart requests per process. Failed uploads/database writes clean up new assets. Cloudinary secrets stay on the server. Earlier live upload-and-delete smoke check passed.
- eSewa totals come from the database; signatures are generated server-side. Only a matching server-to-server COMPLETE response marks an order paid. Browser query parameters cannot mark a payment paid. Test status endpoint returned NOT_FOUND for a deliberately nonexistent transaction; no real payment was made.
- Cached the public catalogue with invalidation on product writes. Existing Redis user cache isolation, expiry, race handling and offline fallback remain covered by tests.
- Added and created MongoDB indexes for product owner/date, order owner/date/payment filters and guest token lookup, without deleting data or old indexes.
- Orders load directly from MongoDB without waiting for up to 20 eSewa network requests. Verification is now explicit via Check eSewa payments or individual order actions.
- Cloudinary gallery images use bounded width and automatic quality/format; small thumbnails no longer request full originals. Docker Nginx configuration now includes gzip and immutable caching for hashed build assets.
- Docker MongoDB and API published ports bind to loopback. Redis was already bound to loopback. Compose changes apply on recreation, not to an existing deployment.

## Observed local state and limits

- Redis connection failed and Docker's Linux engine was unavailable. The app is currently operating on the MongoDB fallback; Redis cache-hit speedups cannot be claimed yet.
- Public catalogue samples before changes: 110 ms on the first request, then 51–52 ms through the local Vite proxy, with three products. This is not a load test or evidence of internet/mobile performance.
- Environment remains development with HTTP localhost and eSewa test mode. Production payment settlement, TLS, load, backups and browser end-to-end flows have not been certified.
- Backend and frontend `npm audit --omit=dev` each reported zero known runtime dependency vulnerabilities. This does not prove the application is vulnerability-free.
- Access JWTs are stateless: clearing cookies on logout prevents ordinary browser reuse, but a previously copied access token can remain valid until its configured expiry (default 15 minutes). Immediate server-side revocation requires a session-version/denylist design. Review this before a public launch.
- Existing accounts still have their original owner/workspace access. Review existing users before launch; closing registration does not revoke previously created accounts.
- Rate limits and concurrent-upload limits are per-process memory limits. For multiple API replicas, use a shared Redis-backed limiter and an edge/WAF limit. Configure TRUST_PROXY to the actual proxy IP/CIDR; do not blindly trust arbitrary forwarded headers.
- Customer catalogue and admin products still load the whole collection. Add pagination and indexed search before a large catalogue. Orders are already paginated.
- Deleting an order is permanent and does not refund or cancel a provider payment; pending deleted payments cannot be reconciled. Consider an archive/audit trail if payment history must be retained.

## Next practical steps

1. Start Docker Desktop, then run `docker compose up -d redis`. For the locally running Node server, use a loopback Redis URL (not Docker's `redis` hostname). Confirm Redis PING and cache-hit measurements before attributing speedups to Redis.
2. Deploy the Vite production build behind Nginx/CDN with HTTPS. Set NODE_ENV=production, CLIENT_URL to the exact HTTPS site origin and live eSewa merchant credentials only when ready for real payments. SameSite=Lax assumes frontend/API are same-site; serving `/api` behind the same origin is simplest.
3. Keep application, MongoDB and Redis geographically close; measure p95 latency and slow database queries with realistic product/order counts. Monitor eSewa separately from page loading.
4. Add shared rate limiting, immediate session revocation, backups, account provisioning/role review and scheduled payment reconciliation before scaling. New admin provisioning should use an explicit trusted workflow; never leave ALLOW_REGISTRATION=true on a public server.

References: [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [Cloudinary image optimization](https://cloudinary.com/documentation/image_optimization), [eSewa ePay documentation](https://developer.esewa.com.np/pages/Epay-V2).
