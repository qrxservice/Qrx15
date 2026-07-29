# QRX — Hostinger VPS Deployment Guide

Step-by-step instructions for deploying QRX to a Hostinger VPS. For full environment variable reference see `ENVIRONMENT_VARIABLES.md`; for backup procedures see `BACKUP_RESTORE.md`.

---

## 0. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x or 22.x | via nvm (see below) |
| pnpm | 10.x | via corepack |
| PostgreSQL | 15+ | `apt install postgresql` |
| nginx | any | `apt install nginx` |
| pm2 | any | `npm install -g pm2` |

```bash
# 1. Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# 2. pnpm
corepack enable
corepack prepare pnpm@10 --activate

# 3. PostgreSQL
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createuser --pwprompt qrx        # choose a strong password
sudo -u postgres createdb -O qrx qrx_production

# 4. nginx + pm2
sudo apt install -y nginx
npm install -g pm2
```

---

## 1. Clone and Configure

```bash
# Clone into /var/www/qrx (or any path you prefer)
sudo mkdir -p /var/www/qrx
sudo chown $USER:$USER /var/www/qrx
git clone https://github.com/YOUR_ORG/qrx.git /var/www/qrx
cd /var/www/qrx
```

Create the backend environment file:

```bash
sudo mkdir -p /var/www/qrx/artifacts/api-server
cat > /var/www/qrx/artifacts/api-server/.env.production << 'EOF'
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production
SESSION_SECRET=CHANGE_ME_64_CHAR_RANDOM_STRING
APP_URL=https://your-domain.com
UPLOAD_DIR=/var/www/qrx/uploads
LOG_LEVEL=info
EOF
chmod 600 /var/www/qrx/artifacts/api-server/.env.production
```

Generate a secure session secret:

```bash
openssl rand -base64 48
# Paste the output as SESSION_SECRET in the .env.production file above
```

Create the uploads directory:

```bash
mkdir -p /var/www/qrx/uploads/{doctors,prescriptions,chat,banners,blog,shop,general}
```

---

## 2. Install, Schema Push, Build

```bash
cd /var/www/qrx

# Install all dependencies
pnpm install --frozen-lockfile

# Push database schema (run once on first deploy, then again after any schema change)
DATABASE_URL="postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production" \
  pnpm --filter @workspace/db run push

# Build frontend + backend
pnpm run build
```

Build outputs:
- `artifacts/rxmanager/dist/public/` — static frontend bundle (nginx serves this)
- `artifacts/api-server/dist/index.mjs` — bundled backend

---

## 3. Start the API Server

```bash
cd /var/www/qrx/artifacts/api-server

pm2 start dist/index.mjs \
  --name qrx-api \
  --node-args="--enable-source-maps" \
  --env-file .env.production

pm2 save
pm2 startup    # follow the printed instructions to enable boot-time start
```

Verify the server started:

```bash
pm2 status
pm2 logs qrx-api --lines 50
curl -s http://localhost:8080/api/health | head -c 200
```

---

## 4. nginx — Reverse Proxy + Static Files

```bash
sudo tee /etc/nginx/sites-available/qrx << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Static frontend (SPA)
    root /var/www/qrx/artifacts/rxmanager/dist/public;
    index index.html;

    # Uploaded files served directly by nginx (not proxied through Node)
    location /uploads/ {
        alias /var/www/qrx/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API + WebSocket proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }

    # SPA fallback — all other paths serve index.html
    location / {
        try_files $uri /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/qrx /etc/nginx/sites-enabled/qrx
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. TLS Certificate (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

After certbot runs, it patches the nginx config automatically. Reload nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Certbot auto-renews via a cron job it installs. Test renewal:

```bash
sudo certbot renew --dry-run
```

---

## 6. Verify Everything Works

```bash
# API health check
curl https://your-domain.com/api/health

# Frontend loads (should return HTML)
curl -s https://your-domain.com | grep -o "<title>.*</title>"

# pm2 shows qrx-api online
pm2 status
```

Open a browser and confirm:
- Home page loads
- Login / registration works
- Doctor search returns results

---

## 7. Update Procedure

Standard safe-update flow:

```bash
cd /var/www/qrx

# 1. Back up database first
/usr/local/bin/qrx-backup.sh

# 2. Pull latest code
git pull origin main

# 3. Reinstall deps
pnpm install --frozen-lockfile

# 4. Apply schema changes (additive only; review prompts before confirming drops)
DATABASE_URL="postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production" \
  pnpm --filter @workspace/db run push

# 5. Rebuild
pnpm run build

# 6. Restart API
pm2 restart qrx-api

# nginx picks up new static files immediately; reload only if nginx config changed
sudo nginx -t && sudo systemctl reload nginx
```

---

## Hostinger-Specific Notes

- **Hostinger VPS firewall**: Open ports 80 and 443 in the Hostinger control panel → Firewall section.
- **Hostinger managed databases**: If you use Hostinger's managed PostgreSQL instead of a local install, set `DATABASE_URL` to the connection string Hostinger provides (usually includes `?sslmode=require`).
- **File manager / backups**: Hostinger's backup feature covers VPS snapshots; additionally run `qrx-backup.sh` for application-level database backups (see `BACKUP_RESTORE.md`).
- **Node.js app hosting**: QRX is NOT compatible with Hostinger's "Node.js App" panel feature (shared hosting). It must run on a VPS with pm2 or systemd.
