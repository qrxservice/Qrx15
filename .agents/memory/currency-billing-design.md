---
name: Multi-currency billing design (BDT/USD)
description: Tiered pricing model, per-entity currency freezing, SSLCommerz BDT-only gating, and IP detection hardening decisions.
---

## Currency resolution
- Currency is **always resolved server-side from IP** via `geoip-lite` (offline DB, no external API). Bangladesh → BDT; all other countries (or failed lookup) → USD.
- `getClientIp()` in `src/lib/currency.ts` reads `X-Forwarded-For` from the **rightmost non-private/reserved** entry (skips 10.x, 172.16-31.x, 192.168.x, 127.x, link-local). Plain rightmost is wrong: Replit's own proxy hops append *internal* IPs (seen in practice: "10.220.143.169, 10.60.0.141, 127.0.0.1") to the right of the chain, so naive-rightmost picked up Replit's own private IP and geoip lookup silently failed → always fell back to USD, even for real Bangladeshi visitors.
- **Why:** leftmost XFF is trivially spoofed (lets anyone lock in favorable billing currency); naive-rightmost breaks because Replit appends private hop IPs after the real client IP.
- **Known gap:** Replit's dev/workspace preview domain proxy does not forward the browser's real IP at all — it always presents the same internal-only chain and ignores/overwrites any client-supplied XFF header. IP-based currency detection cannot be verified from the workspace preview; only a real visit through the published production domain will show a real client IP for geoip lookup.
- **How to apply:** any future IP-based decision (rate limits, geo-blocks, etc.) should reuse `getClientIp()` rather than re-deriving XFF parsing.

## Currency freezing (per-entity)
- Currency is frozen at the moment of the creation event and stored on the entity:
  - `doctors.currency` — set at registration from IP; reused for all subsequent subscription renewals and SSLCommerz checkout. Never re-detected after registration.
  - `appointments.donation_currency` — re-detected fresh per booking IP and frozen into the appointment row alongside `donation_amount`. Matches the existing donation-amount-freeze pattern.
- **Why:** decouples billing from later admin changes to global pricing or future IP changes (doctor travels, VPN, etc.). The entity's original currency context is authoritative.

## Tiered doctor subscription pricing
- 3 BMDC-validity-year tiers (tier1, tier2, tier3) exist separately for BDT and USD (10 columns total in `app_settings`).
- Tier logic: if `bmdcValidityYears <= tier1MaxYears` → fee1; else if `<= tier2MaxYears` → fee2; else → fee3 (open-ended).
- Admin PUT `/admin/settings` validates `tier1MaxYears < tier2MaxYears` for each currency; returns 400 on violation.
- Default seeded values: BDT 0/500/1000, USD 0/5/10 (tiers ≤5, ≤10, >10 years).
- **Why:** replaces old hardcoded `calcSubscriptionFee` so admins can adjust without code changes.

## SSLCommerz BDT-only gate
- SSLCommerz is a Bangladesh-only payment gateway and cannot process USD.
- `POST /doctors/me/subscription/pay/sslcommerz` checks `doctor.currency === "USD"` immediately after loading the doctor record and returns a clear 400 directing the doctor to contact admin for manual payment.
- USD doctors are expected to pay via admin-managed manual payment (existing flow).
- **Why:** accepted scope limitation — true USD online payment execution is out of scope; SSLCommerz only supports BDT.

## geoip-lite bundling
- `geoip-lite` must be in the `external` array in `build.mjs`. When bundled by esbuild, `__dirname` resolves to the dist output dir, causing geoip to look for its `.dat` files at `artifacts/api-server/data/` instead of inside `node_modules/geoip-lite/data/`.
- **Why:** geoip-lite uses `path.join(__dirname, '..', 'data', ...)` relative to its own lib file; bundling breaks that path.

## Public pricing endpoint
- `GET /api/pricing` (no auth) returns currency-resolved tiers, monthly fee, and donation config for the caller's IP. Used by the frontend doctor registration page and donation dialogs.
- Mirrors the existing public `GET /api/app-settings` pattern.
