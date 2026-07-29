# QRX — Doctor Booking & Prescription Platform

A full-stack pnpm monorepo: React/Vite frontend + Express/Node.js backend + PostgreSQL.

## Stack

| Layer | Package | Notes |
|-------|---------|-------|
| Frontend | `artifacts/rxmanager` | React + Vite + Tailwind + shadcn/ui |
| Backend | `artifacts/api-server` | Express 5 + Drizzle ORM + pino logging |
| DB schema | `lib/db` | Drizzle Kit, push with `pnpm --filter @workspace/db run push` |
| Shared libs | `lib/api-zod`, `lib/api-spec`, `lib/api-client-react` | Zod contracts, typed client hooks |

## Running in development

The **"Start application"** workflow runs both services:

```
PORT=8080 pnpm --filter @workspace/api-server run dev   # Express → :8080
PORT=5000 pnpm --filter @workspace/rxmanager run dev    # Vite   → :5000 (proxy /api → 8080)
```

Vite proxies `/api/*` to `http://localhost:8080`.

## Database

Schema is managed with Drizzle Kit. To push schema changes to the DB:

```bash
pnpm --filter @workspace/db run push
```

`DATABASE_URL` is provided automatically by Replit's built-in PostgreSQL module — no manual setup needed.

## Environment variables

| Key | Where set | Purpose |
|-----|-----------|---------|
| `DATABASE_URL` | Replit (auto) | PostgreSQL connection string |
| `SESSION_SECRET` | Replit Secret | Express session signing |
| `APP_URL` | `.replit` shared env | Canonical public origin (used for CORS) |
| `UPLOAD_DIR` | `.replit` shared env | Local file upload directory |
| `NODE_ENV` | `.replit` shared env | `development` / `production` |

## Production build

```bash
pnpm run build
# → artifacts/rxmanager/dist/public/   (static frontend, served by api-server)
# → artifacts/api-server/dist/index.mjs
PORT=8080 NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs
```

See `DEPLOYMENT_GUIDE.md` for Hostinger VPS instructions.

## User preferences

- Keep the existing monorepo structure (pnpm workspaces under `artifacts/` and `lib/`).
- Do not restructure or migrate the stack.
