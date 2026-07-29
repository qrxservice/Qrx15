---
name: Multi-artifact autoscale deploy needs backend to serve frontend statics
description: Why this repo's autoscale publish failed at the promote/health-check step and how it was fixed.
---

This repo (QRX / rxmanager + api-server) publishes as a single autoscale
service: `.replit`'s `[deployment]` `run` command only starts the
`api-server` Node process (per `DEPLOYMENT_GUIDE.md`'s documented
architecture — one backend process, frontend is a static build with no
separate server in production).

Before this fix, `api-server`'s Express app (`artifacts/api-server/src/app.ts`)
only mounted `/api` routes. In production there is no nginx/second process to
serve the built rxmanager frontend, so `GET /` returned 404. Autoscale's
default startup probe hits `GET /` and requires 200 — the promote step timed
out ("Creating Autoscale service" repeated with no error, build itself
succeeded) and publishing failed with "built successfully but failed to
start."

**Why:** Cloud Run/autoscale health-checks `GET /` by default for this
deployment's router mode; the artifact-level per-service health path
(`/api/healthz` in `artifacts/api-server/.replit-artifact/artifact.toml`)
is not what the flat single-run-command `[deployment]` block in `.replit`
checks.

**Fix applied:** `app.ts` now, only when `NODE_ENV === "production"`, serves
`artifacts/rxmanager/dist/public` as static files and falls back non-`/api`
GET requests to `index.html` (SPA routing). Dev is unaffected — the Vite dev
server handles `/` there and this block is skipped.

**How to apply:** If this project's deployment architecture changes (e.g. a
future move to per-artifact router-managed multi-service deploys, or splitting
into two separate deployments), revisit whether this static-serving shim is
still needed — it's a workaround for the current single-process autoscale
setup, not a universal requirement.
