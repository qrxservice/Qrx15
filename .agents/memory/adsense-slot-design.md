---
name: AdSense Slot Design
description: Design decisions for the Google AdSense placement feature in QRX.
---

# AdSense Slot Design

## Trust model
Admin-provided HTML/JS is injected via `dangerouslySetInnerHTML` — intentional. Admin role is treated as a trusted code publisher. The public `GET /adsense-slots` endpoint exposes raw code; only enabled slots are rendered by the frontend component.

## DB table: adsense_slots
- `position` (text, UNIQUE) — one of 7 fixed values in `ADSENSE_POSITIONS`
- `code` (text) — raw AdSense embed snippet
- `enabled` (boolean, default false)
- Seeded via bulk `INSERT … ON CONFLICT DO NOTHING` at module load (not per-request)

## 7 positions
`homepage_hero`, `homepage_middle`, `homepage_bottom`, `doctor_listing`, `doctor_detail`, `blog_detail`, `sidebar`

## API
- `GET /adsense-slots` — public, returns all 7 slots
- `PUT /admin/adsense-slots/:position` — admin-only, updates code + enabled per position

## Frontend component
`AdsenseSlot` in `PromoSlots.tsx` — fetches via `useListAdsenseSlots()`, renders nothing if slot not enabled or code is empty.

## Admin UI pattern
Draft state initialized from server data on first load only (`adsenseDraft === null` guard). Per-slot pending state prevents stale code overwrites. Slots disabled until data resolves (shows Loader2 spinner).

**Why:**
- Per-request `ensureSlots()` with 7 SELECTs was a code-review finding; replaced with startup seed.
- `dangerouslySetInnerHTML` is acceptable because only the admin role can write slot code.
