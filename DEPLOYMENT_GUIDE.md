# QRX — Hostinger VPS Deployment Guide (Node.js + PostgreSQL)

This guide covers deploying the existing QRX monorepo (pnpm workspaces: `artifacts/rxmanager` frontend, `artifacts/api-server` backend, shared `lib/*` packages) to a Hostinger VPS with your own PostgreSQL database. It does not change any code or business logic — only how the existing build/start commands are run outside Replit.

## File Storage

File uploads use **local disk storage** — no external cloud storage service is required. Uploaded files land in a configurable directory on the server, organized by category:

```
<UPLOAD_DIR>/
  doctors/       — doctor profile photos
  prescriptions/ — prescription PDFs / lab reports
  chat/          — chat message attachments
  banners/       — hero / banner images
  blog/          — blog post cover images
  shop/          — shop product images
  general/       — anything not assigned a category
```

Set `UPLOAD_DIR` to a persistent path on the VPS (e.g. `/var/www/qrx/uploads`). Defaults to `<api-server cwd>/uploads` if not set. The directory and all subdirectories are created automatically on first start.

**Important:** Configure nginx to serve uploaded files directly from disk instead of proxying them through Node.js — this significantly reduces server load for image-heavy pages. See the nginx config in Section 2 below.

**Backup:** Include `UPLOAD_DIR` in your backup procedure. A database backup alone will not recover uploaded files.

---

## 0. Prerequisites on the VPS

- Ubuntu 22.04+ (or similar) Hostinger VPS with SSH access
- Node.js 24.x and `corepack`/`pnpm` installed
- PostgreSQL 15+ (either installed on the VPS or a managed instance you have a connection string for)
- `nginx` (reverse proxy + static file serving)
- `pm2` (or systemd) to keep the Node process alive and restart on crash/reboot

```bash
# Node.js 24 via nvm (adjust if Hostinger provides Node another way)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24
corepack enable
corepack prepare pnpm@10 --activate

# PostgreSQL
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createuser --pwprompt qrx
sudo -u postgres createdb -O qrx qrx_production

# nginx + pm2
sudo apt install -y nginx
npm install -g pm2
```

Clone the repository onto the VPS (or upload the export package) into e.g. `/var/www/qrx`.

---

## 1. Build Command

Run from the repo root. This type-checks shared libs, then builds every package with a `build` script (the frontend via Vite, the backend via esbuild):

```bash
cd /var/www/qrx
pnpm install --frozen-lockfile
pnpm run build
```

This produces:
- `artifacts/rxmanager/dist/public/` — the static frontend bundle (served by nginx)
- `artifacts/api-server/dist/index.mjs` — the bundled backend entrypoint

If you only need to rebuild one side:

```bash
pnpm --filter @workspace/api-server run build     # backend only
pnpm --filter @workspace/rxmanager run build       # frontend only
```

---

## 2. Start Command

Only the **backend** needs a running Node process; the frontend is a static build served directly by nginx.

```bash
cd /var/www/qrx/artifacts/api-server
NODE_ENV=production PORT=8080 pm2 start dist/index.mjs --name qrx-api --node-args="--enable-source-maps"
pm2 save
pm2 startup   # follow the printed instructions to enable boot-time start
```

Equivalent plain-Node command (no pm2), if you prefer systemd instead:

```bash
NODE_ENV=production PORT=8080 node --enable-source-maps /var/www/qrx/artifacts/api-server/dist/index.mjs
```

Example systemd unit (`/etc/systemd/system/qrx-api.service`) if you'd rather not use pm2:

```ini
[Unit]
Description=QRX API server
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/var/www/qrx/artifacts/api-server
EnvironmentFile=/var/www/qrx/artifacts/api-server/.env.production
ExecStart=/usr/bin/node --enable-source-maps dist/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now qrx-api
```

### Serving the frontend + proxying the API (nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/qrx/artifacts/rxmanager/dist/public;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;   # needed for the WebSocket queue/chat features
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri /index.html;   # SPA fallback
    }
}
```

Then add TLS (recommended, e.g. via Hostinger's SSL or `certbot --nginx`).

---

## 3. Environment Variables

Set these wherever your process manager reads env from (pm2 `--env`, an `EnvironmentFile` for systemd, or a `.env` loaded before start). **Never commit secrets to git.**

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | Backend listen port (e.g. `8080`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://qrx:PASSWORD@localhost:5432/qrx_production` |
| `SESSION_SECRET` | Yes | Long random string used to sign sessions/tokens. Generate with `openssl rand -base64 48` |
| `APP_URL` | Yes | Public URL of the deployed app, e.g. `https://your-domain.com` (used in emails/links) |
| `UPLOAD_DIR` | Recommended | Absolute path for uploaded file storage (e.g. `/var/www/qrx/uploads`). Defaults to `<api-server cwd>/uploads`. Set to a persistent path outside the deployment directory so uploads survive re-deploys. |
| `LOG_LEVEL` | No | Pino log level (`info`, `debug`, etc.); defaults sensibly if unset |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `SMTP_ENABLED` | No | Default values for the email-settings admin page; SMTP can also be fully configured later from the admin UI (stored in the DB), so these are optional bootstrap defaults, not hard requirements |

The frontend build only needs `BASE_PATH` (defaults to `/`) at **build time**, not at runtime — set it before running `pnpm run build` if you're not deploying to the domain root.

Example `.env.production` for the backend:

```dotenv
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production
SESSION_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_STRING
APP_URL=https://your-domain.com
UPLOAD_DIR=/var/www/qrx/uploads
LOG_LEVEL=info
```

---

## 4. Database Migration Command

The schema lives in `lib/db/src/schema/` and is applied with Drizzle Kit's `push` (this repo doesn't use versioned SQL migration files — schema state is pushed directly):

```bash
cd /var/www/qrx
DATABASE_URL="postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production" \
  pnpm --filter @workspace/db run push
```

Run this:
- Once, right after provisioning the production database (before first start)
- Again after every deploy that changes `lib/db/src/schema/`

If `drizzle-kit push` reports a destructive change it's unsure about, it will prompt for confirmation — **never** use `push-force` on production without a fresh backup, since it can drop columns/tables it deems safe to remove.

On first boot, the backend also seeds default departments and a default admin/doctor/patient user automatically (`seedDefaultUsers`) — no separate seed command needed.

---

## 5. Backup Procedure

Until the in-app Backup Center (planned as a follow-up task) exists, back up manually via `pg_dump`.

```bash
# One-off manual backup
pg_dump "postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production" \
  -F c -f /var/backups/qrx/qrx_$(date +%Y%m%d_%H%M%S).dump
```

Automated daily backup with rotation (keeps the last 14 days):

```bash
sudo mkdir -p /var/backups/qrx
sudo tee /usr/local/bin/qrx-backup.sh > /dev/null <<'EOF'
#!/bin/bash
set -euo pipefail
BACKUP_DIR=/var/backups/qrx
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump "$DATABASE_URL" -F c -f "$BACKUP_DIR/qrx_$TIMESTAMP.dump"
find "$BACKUP_DIR" -name "qrx_*.dump" -mtime +14 -delete
EOF
sudo chmod +x /usr/local/bin/qrx-backup.sh

# Cron: run nightly at 2am, with DATABASE_URL available to the script
echo 'DATABASE_URL=postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production' | sudo tee /etc/qrx-backup.env
(crontab -l 2>/dev/null; echo "0 2 * * * . /etc/qrx-backup.env && /usr/local/bin/qrx-backup.sh") | crontab -
```

Also back up any uploaded files/object storage bucket separately (whichever storage backend you land on per the warning above) — database backups alone won't include uploaded images/documents.

**Restore** from a dump:

```bash
pg_restore --clean --if-exists -d "postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production" \
  /var/backups/qrx/qrx_20260101_020000.dump
```

Always take a fresh backup immediately before restoring or running any destructive migration.

---

## 6. Future Update Procedure

Standard "safe update" flow — pulls new code, updates dependencies/schema, rebuilds, and restarts without touching existing data:

```bash
cd /var/www/qrx

# 1. Back up first, always
DATABASE_URL="postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production" \
  /usr/local/bin/qrx-backup.sh

# 2. Pull latest code
git pull origin main

# 3. Reinstall deps (in case package.json changed)
pnpm install --frozen-lockfile

# 4. Apply any schema changes (additive — existing rows are preserved)
DATABASE_URL="postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production" \
  pnpm --filter @workspace/db run push

# 5. Rebuild frontend + backend
pnpm run build

# 6. Restart the backend process
pm2 restart qrx-api
# (or: sudo systemctl restart qrx-api  — if using the systemd unit)

# nginx serves the new static files immediately; no nginx restart needed
# unless you changed the nginx config itself, in which case:
sudo nginx -t && sudo systemctl reload nginx
```

Notes:
- `drizzle-kit push` only adds/adjusts columns and tables to match the current schema — it does not delete data that isn't explicitly removed from the schema file. Review its output before confirming any prompt that mentions dropping a column/table.
- Keep at least the last 2–3 backups before any update in case a rollback is needed (`pm2 restart` after `git checkout <previous-commit>` + `pnpm install` + `pnpm run build` + `pg_restore` from the pre-update backup).
- If you changed `.env.production` values, remember pm2/systemd won't pick them up until you restart the process (`pm2 restart qrx-api` / `systemctl restart qrx-api`).
