---
name: QRX security hardening decisions
description: Key tradeoffs made when hardening api-server auth/CORS/rate-limiting; read before touching auth, CORS config, or public lookup endpoints.
---

- Used `bcryptjs` (pure JS) instead of `bcrypt` (native binding) for password hashing.
  **Why:** `bcrypt` needs a native build step; pnpm's build-script approval prompt is interactive
  and hangs in this sandbox with no clean non-interactive bypass found. **How to apply:** if a future
  dependency needs native compilation here, prefer a pure-JS alternative first rather than fighting
  `pnpm approve-builds`.
- Legacy plaintext passwords are migrated lazily: `verifyPassword()` falls back to a plain compare
  when the stored value isn't a bcrypt hash, and login rehashes to bcrypt on success.
  **Why:** avoids forcing a mass password reset / locking out seeded demo accounts.
  **How to apply:** any new code path that reads `usersTable.password` directly (bypassing
  `lib/password.ts`) will silently reintroduce a plaintext comparison bug — always go through
  `hashPassword`/`verifyPassword`.
- CORS is locked to `APP_URL` + `REPLIT_DOMAINS` origins (credentials: true), not a wildcard.
  **Why:** `app.use(cors())` with no options had reflected any origin. **How to apply:** when this
  project moves to Hostinger hosting, `APP_URL`/`REPLIT_DOMAINS` must be updated to the real
  production domain or the frontend will get CORS 403s.
- `appointments/track` and `prescriptions/verify/:ref` are intentionally public/unauthenticated
  (patient self-service by phone/reference) — only rate-limited, not locked down, per product design.
  Left as an open item for the user to decide if stronger verification is wanted.
- bKash/Nagad appear in `payment_gateways` seed data and the original audit prompt but have no
  actual provider implementation in code (only SSLCommerz/aamarPay/ShurjoPay exist) — flagged to
  the user, not yet resolved either way.
