# QRX — Environment Variables Reference

All environment variables are consumed by the **API server** (`artifacts/api-server`). The frontend is built at compile time and has no runtime env vars except `BASE_PATH` (build-time only). Never commit secrets to git; use an `.env.production` file outside version control or your process manager's env mechanism.

---

## Required (app will not function without these)

| Variable | Example | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Must be `production` in production; enables security hardening and disables dev-only middleware |
| `PORT` | `8080` | TCP port the API server listens on; nginx proxies to this |
| `DATABASE_URL` | `postgresql://qrx:pass@localhost:5432/qrx_production` | PostgreSQL connection string; supports `?sslmode=require` for remote/managed DBs |
| `SESSION_SECRET` | *(64-char random string)* | Signs HTTP session cookies; **must be a long, random, unique value**. Generate: `openssl rand -base64 48` |
| `APP_URL` | `https://your-domain.com` | Canonical public URL (no trailing slash); used for CORS origin allowlist, email links, QR codes, and SSLCommerz callback URLs |

---

## Recommended

| Variable | Default | Description |
|----------|---------|-------------|
| `UPLOAD_DIR` | `<api-server cwd>/uploads` | Absolute path for uploaded file storage. **Set to a persistent path outside the repo directory** so uploads survive re-deploys, e.g. `/var/www/qrx/uploads` |
| `LOG_LEVEL` | `info` | Pino log level: `fatal`, `error`, `warn`, `info`, `debug`, `trace`. Use `info` in production |

---

## Payment — SSLCommerz (Bangladesh)

Required only if you accept online payments via SSLCommerz (BDT gateway).

| Variable | Default | Description |
|----------|---------|-------------|
| `SSL_COMMERZ_STORE_ID` | *(none)* | SSLCommerz store ID from their dashboard |
| `SSL_COMMERZ_STORE_PASSWORD` | *(none)* | SSLCommerz store password |
| `SSL_COMMERZ_SANDBOX` | `false` | Set `true` for SSLCommerz sandbox/test mode; `false` for live |

---

## Payment — Bangla QR

| Variable | Default | Description |
|----------|---------|-------------|
| `BANGLA_QR_ENABLED` | `true` | Enable/disable Bangla QR payment option |

---

## Currency & Language

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_LANGUAGE` | `auto` | `auto` = detect from visitor IP country; `bn` = always Bangla; `en` = always English |
| `DEFAULT_COUNTRY` | `auto` | `auto` = detect from visitor IP; or a 2-letter ISO country code |
| `CURRENCY_MODE` | `auto` | `auto` = detect from IP; `BDT` = force BDT; `USD` = force USD |
| `BDT_CURRENCY` | `BDT` | Currency code label for Bangladeshi Taka |
| `USD_CURRENCY` | `USD` | Currency code label for US Dollar |

---

## Email / SMTP

Email settings can also be configured from the admin UI after first boot (stored in the database). These env vars set bootstrap defaults only — the admin UI values override them.

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | *(none)* | SMTP server hostname, e.g. `smtp.gmail.com` |
| `SMTP_PORT` | *(none)* | SMTP port, e.g. `587` (STARTTLS) or `465` (SSL) |
| `SMTP_USER` | *(none)* | SMTP username / email address |
| `SMTP_PASS` | *(none)* | SMTP password or app password |
| `SMTP_FROM_EMAIL` | *(none)* | Sender address, e.g. `noreply@your-domain.com` |
| `SMTP_FROM_NAME` | *(none)* | Sender display name, e.g. `QRX Platform` |
| `SMTP_ENABLED` | `false` | Set `true` to enable outbound email |

---

## Optional / Integrations

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_MAPS_API_KEY` | *(none)* | Used for clinic location maps; app works without it (maps disabled) |

---

## Build-time Frontend Only

Set these **before** running `pnpm run build`; they are baked into the frontend bundle and have no effect at runtime.

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_PATH` | `/` | URL base path if the app is not served from the domain root (e.g. `/qrx/`). Rarely needed |

---

## Process Manager Setup

**pm2 with env file:**

```bash
pm2 start dist/index.mjs --name qrx-api --node-args="--enable-source-maps" --env-file .env.production
```

**systemd with EnvironmentFile:**

```ini
[Service]
EnvironmentFile=/var/www/qrx/artifacts/api-server/.env.production
ExecStart=/usr/bin/node --enable-source-maps dist/index.mjs
```

Changes to `.env.production` only take effect after restarting the process:

```bash
pm2 restart qrx-api
# or
sudo systemctl restart qrx-api
```
