# QRX — Backup & Restore Guide

QRX has two backup targets: the **PostgreSQL database** and the **upload directory**. A complete backup requires both.

---

## What to Back Up

| Target | Location | Contents |
|--------|----------|----------|
| Database | PostgreSQL (`qrx_production`) | All application data: users, doctors, prescriptions, appointments, queue entries, settings, etc. |
| Uploads | `UPLOAD_DIR` (e.g. `/var/www/qrx/uploads`) | Doctor profile photos, prescription PDFs/images, chat attachments, banners, blog images, shop images |

> **Important:** A database backup alone does not recover uploaded files. The database stores file *paths*; the actual files live on disk in `UPLOAD_DIR`.

---

## Quick Manual Backup

```bash
# Database
pg_dump "postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production" \
  -F c -f /var/backups/qrx/qrx_$(date +%Y%m%d_%H%M%S).dump

# Uploads (copy to a backup location)
rsync -av /var/www/qrx/uploads/ /var/backups/qrx/uploads/
```

---

## Automated Daily Backup Script

### 1. Install the script

```bash
sudo mkdir -p /var/backups/qrx/uploads
sudo tee /usr/local/bin/qrx-backup.sh > /dev/null << 'EOF'
#!/bin/bash
set -euo pipefail

BACKUP_DIR=/var/backups/qrx
UPLOAD_DIR=/var/www/qrx/uploads
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=14

# Source the DB URL from the app's env file
source /var/www/qrx/artifacts/api-server/.env.production

# Database dump
pg_dump "$DATABASE_URL" -F c -f "$BACKUP_DIR/qrx_$TIMESTAMP.dump"
echo "Database backup: $BACKUP_DIR/qrx_$TIMESTAMP.dump"

# Uploads snapshot (hard-linked for efficiency)
rsync -av --link-dest="$BACKUP_DIR/uploads_latest" \
  "$UPLOAD_DIR/" "$BACKUP_DIR/uploads_$TIMESTAMP/"
ln -sfn "$BACKUP_DIR/uploads_$TIMESTAMP" "$BACKUP_DIR/uploads_latest"
echo "Uploads backup: $BACKUP_DIR/uploads_$TIMESTAMP"

# Prune old database dumps
find "$BACKUP_DIR" -maxdepth 1 -name "qrx_*.dump" -mtime +$RETENTION_DAYS -delete

# Prune old upload snapshots
find "$BACKUP_DIR" -maxdepth 1 -name "uploads_20*" -type d -mtime +$RETENTION_DAYS \
  -exec rm -rf {} +

echo "Backup complete: $TIMESTAMP"
EOF
sudo chmod +x /usr/local/bin/qrx-backup.sh
```

### 2. Schedule with cron (daily at 2 AM)

```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/qrx-backup.sh >> /var/log/qrx-backup.log 2>&1") \
  | crontab -
```

### 3. Test the script

```bash
sudo /usr/local/bin/qrx-backup.sh
ls -lh /var/backups/qrx/
```

---

## Database Restore

### Restore to an existing database

```bash
# Stop the API server first to prevent writes during restore
pm2 stop qrx-api

# Restore (--clean drops existing objects first; --if-exists suppresses errors on missing objects)
pg_restore --clean --if-exists \
  -d "postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production" \
  /var/backups/qrx/qrx_20260101_020000.dump

# Start the API server
pm2 start qrx-api
```

### Restore to a fresh database

```bash
# Create a fresh target database
sudo -u postgres dropdb qrx_production    # only if it exists and you want to wipe it
sudo -u postgres createdb -O qrx qrx_production

# Restore
pg_restore \
  -d "postgresql://qrx:CHANGE_ME@localhost:5432/qrx_production" \
  /var/backups/qrx/qrx_20260101_020000.dump
```

---

## Uploads Restore

```bash
# Restore from a specific snapshot
rsync -av /var/backups/qrx/uploads_20260101_020000/ /var/www/qrx/uploads/

# Or restore from the latest snapshot
rsync -av /var/backups/qrx/uploads_latest/ /var/www/qrx/uploads/
```

---

## Verify a Backup

```bash
# Check the dump file is valid
pg_restore --list /var/backups/qrx/qrx_20260101_020000.dump | head -20

# Check dump file size (a near-zero file is a sign of failure)
ls -lh /var/backups/qrx/qrx_20260101_020000.dump

# Check uploads snapshot
ls -lh /var/backups/qrx/uploads_20260101_020000/
```

---

## Off-site Backup (Recommended)

For disaster recovery, copy backups to a remote location:

```bash
# Example: sync to an S3-compatible bucket (requires rclone or aws-cli)
rclone sync /var/backups/qrx remote:qrx-backups

# Example: rsync to another server
rsync -avz /var/backups/qrx/ backup-user@backup-server:/backups/qrx/
```

---

## Before Any Destructive Operation

Always take a fresh backup immediately before:
- Running `pnpm --filter @workspace/db run push` if it shows prompts about dropping columns/tables
- Restoring from a dump
- Upgrading PostgreSQL
- Any bulk data operation

```bash
/usr/local/bin/qrx-backup.sh && echo "Backup OK — safe to proceed"
```
