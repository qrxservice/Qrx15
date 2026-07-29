---
name: Image Upload URL Pattern
description: Rules for storing and displaying uploaded image URLs in QRX — objectPath in DB, storageUrl() only for display.
---

# Image Upload URL Pattern

**The rule**: always store `res.objectPath` (e.g. `/objects/uploads/<uuid>`) in the database. Never store `storageUrl(res.objectPath)`.

**Why:** `storageUrl()` converts objectPath → `/api/storage/objects/…` for use as a browser `<img src>`. The backend `canReadObject()` in `storage.ts` checks the DB by objectPath (`/objects/uploads/<uuid>`). If you store the display URL instead, the lookup never matches and every read returns 403.

**How to apply:**
- After upload: `setField(res.objectPath)` then save to DB — never `storageUrl(res.objectPath)`.
- In JSX: `<img src={storageUrl(field)} />` — always wrap with storageUrl() before rendering.
- When adding a new image-URL DB column: add a corresponding lookup in `canReadObject()` in `artifacts/api-server/src/routes/storage.ts`.

## Bug that was fixed

`AdminShopPage.tsx` was calling `storageUrl(res.objectPath)` before saving to `form.imageUrl`, then passing that display URL to the product save API. The DB stored `/api/storage/objects/uploads/<uuid>` and `canReadObject` could never match it. All shop product images returned 403.

Same display-without-storageUrl bug existed in: `ShopPage.tsx`, `ProductDetailPage.tsx`, `MyOrdersPage.tsx`, `TrackOrderPage.tsx`, `CartPage.tsx`.

## Missing canReadObject entries (also fixed)

`appSettingsTable.siteLogoUrl`, `faviconUrl`, `footerLogoUrl` were not checked in `canReadObject` — logo/favicon images always 403. Fixed by combining into a single OR query on appSettingsTable.
