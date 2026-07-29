---
name: Queue Display Infrastructure
description: Architecture decisions for the real-time queue display system built into QRX.
---

# Queue Display Infrastructure

## Architecture

- **Transport:** Socket.IO (path `/api/socket.io`) alongside existing raw WebSocket (`/api/ws`). Both coexist on the same HTTP server.
- **Rooms:** `doctor-{doctorId}` — one room per doctor, isolates chamber displays perfectly.
- **Event flow:** queue route mutations call `broadcastQueueUpdate(doctorId, eventType)` in `wsManager.ts`, which emits to raw WS clients AND dynamically imports `socketManager.broadcastSocketEvent` to emit to Socket.IO rooms. Dynamic import avoids circular init issues.
- **Events:** `queue:called`, `queue:updated`, `queue:completed`, `queue:skipped`, `queue:joined` (appointments add-to-queue).

## Display URL

- `/display/:deviceId` — public, no auth required. `deviceId` = integer PK from `queue_display_devices`.
- Existing `/queue-display?doctorId=X` still works (backwards compat).

## New DB columns on queue_display_devices

`show_patient_name`, `show_doctor_name`, `voice_enabled`, `voice_language`, `theme` (all with safe defaults).

## Public API

`GET /api/display/:deviceId` — returns device settings + sanitized queue state + doctor/chamber info. No auth needed. Never exposes patient phone.

## Admin

`GET /api/admin/display-connections` — returns live Socket.IO connection counts per doctor room.
Frontend: `/admin/displays` page (AdminDisplaysPage.tsx). Nav link added to DashboardLayout.

## Voice

Client-side Web Speech API (`window.speechSynthesis`) — no server involvement. Triggered on `queue:called` events. Bengali: `bn-BD`, English: `en-US`.

## Vite Proxy

Added `ws: true` to the `/api` proxy in `vite.config.ts` so Socket.IO WebSocket upgrades are forwarded from port 5000 → 8080 in development.

## Backward Compatibility

All existing queue routes (`broadcastQueueUpdate` in wsManager) still function identically — Socket.IO is additive. No existing features broken. Raw ws endpoint kept for patient tracker hook.

**Why Socket.IO over raw ws extension:** auto-reconnect with backoff, polling fallback (works on Android TV browsers), built-in room management.
