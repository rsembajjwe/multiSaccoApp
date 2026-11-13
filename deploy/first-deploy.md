# First production deploy — Hetzner CPX31 / CX32

End-to-end runbook for hosting Tereka Online on a single Hetzner Cloud server (Ubuntu 24.04). The
whole stack — Spring Boot backend, PostgreSQL, Caddy (TLS + static frontend), and the backup sidecar
— runs from `docker-compose.yml` + `docker-compose.prod.yml` on one box. Sized for ~100 SACCOs /
5,000 members with years of headroom.

> Deploy only from a **green, committed** revision: `npm run check` and `mvnw.cmd test` must pass and
> the tree must be committed before you pull it onto the server.

---

## 1. Create the server
Hetzner Cloud console → new server:
- Image: **Ubuntu 24.04**
- Type: **CPX31** (4 vCPU / 8 GB / 160 GB) or **CX32**
- Add your **SSH key**
- Attach a **Cloud Firewall** allowing inbound **22, 80, 443** only (restrict 22 to your IP if possible)

Note the public IPv4.

## 2. Point DNS first
Create an **A record**: `DOMAIN` (and `www`) → server IP. Caddy fetches the Let's Encrypt certificate
on first start, so the domain must already resolve or TLS will keep retrying.

## 3. Base server setup
SSH in as root, then:
```bash
adduser deploy && usermod -aG sudo deploy         # non-root user; copy your SSH key to it
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
sudo apt update && sudo apt -y install ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh       # Docker + compose plugin
sudo usermod -aG docker deploy                    # re-login after this
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt -y install nodejs
```

## 4. Get the code
```bash
cd /srv && sudo git clone <your-repo-url> app && sudo chown -R deploy:deploy app && cd /srv/app
```

## 5. Build the production frontend bundle (on the host)
Caddy serves `dist-vite`, which is git-ignored, so build it here (and on every redeploy):
```bash
npm ci
npm run build:vite        # produces dist-vite/index.html + tereka-classic-app.js
```

## 6. Configure secrets
```bash
cp deploy/hetzner.env.example deploy/hetzner.env
openssl rand -base64 32    # -> SACCO_PII_ENCRYPTION_KEY (>=32)
openssl rand -base64 24    # -> SACCO_MOBILE_MONEY_CALLBACK_SECRET (>=24)
openssl rand -base64 24    # -> POSTGRES_PASSWORD (>=16; use >=24)
nano deploy/hetzner.env
mkdir -p kyc-docs backups
sudo install -d -m 700 -o deploy -g deploy /opt/tereka/secrets
printf '%s' 'https://replace-with-operations-webhook.example' > /opt/tereka/secrets/alertmanager-webhook-url
openssl rand -base64 32 > /opt/tereka/secrets/grafana-admin-password
chmod 600 /opt/tereka/secrets/alertmanager-webhook-url /opt/tereka/secrets/grafana-admin-password
```
Fill in at least:
- `DOMAIN`, `ACME_EMAIL`
- `POSTGRES_PASSWORD`, `SACCO_PII_ENCRYPTION_KEY`, `SACCO_MOBILE_MONEY_CALLBACK_SECRET`
- AfroSMS (`SACCO_AFROSMS_*`) and Gmail SMTP (`SACCO_GMAIL_*`) credentials
- `SACCO_MOBILE_MONEY_PROVIDER` + that provider's **production** keys and **non-sandbox base URL**
- `SACCO_DOCUMENT_STORAGE_LOCAL_ROOT` (absolute path, e.g. `/srv/app/kyc-docs`)
- the four `SACCO_BOOTSTRAP_PLATFORM_ADMIN_*` values (your first real login)
- `ALERTMANAGER_WEBHOOK_URL_FILE` and `GRAFANA_ADMIN_PASSWORD_FILE` pointing to the protected files above
- keep `SACCO_DEMO_LOGINS_ENABLED=false`

Replace the example webhook URL with the HTTPS endpoint issued by the selected operations channel.
Do not place the URL or Grafana password directly in `deploy/hetzner.env`; Compose mounts the files as
secrets. Prometheus, Alertmanager, and Grafana remain internal-only and should be reached through an
SSH tunnel or private management network.

The startup readiness validators enforce these: weak/placeholder secrets, sandbox provider URLs, or a
missing PII key will **stop the app from starting**. That is intentional. Setting demo logins to false
also suspends and purges the seeded demo SACCOs/accounts on startup.

## 7. Build and launch
```bash
docker compose --env-file deploy/hetzner.env \
  -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
`--env-file` supplies compose interpolation (`${POSTGRES_PASSWORD}`, `${DOMAIN}`); the backend service's
`env_file:` injects the full `SACCO_*` set into the container. The first build compiles the backend
in-container (`./mvnw package`) — a few minutes.

## 8. Watch it come up
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
```
Confirm: Flyway migrations apply, readiness validators pass, demo purge runs, app listens on 8080,
Caddy obtains TLS.

## 9. Smoke test
```bash
curl -fsS https://<DOMAIN>/actuator/health/readiness     # {"status":"UP"}
```
Open `https://<DOMAIN>`, log in with the bootstrap platform admin, create your first real SACCO.

## 10. Backups + off-site (do not skip)
Daily compressed dumps land in `./backups` via the backup sidecar. Ship them off the box:
```bash
sudo apt -y install rclone && rclone config     # configure object storage once
crontab -e
# 0 * * * * rclone copy /srv/app/backups remote:tereka-backups --min-age 1m
```
Rehearse a restore monthly — see `deploy/RESTORE.md`.

## Security posture (already enforced by the compose)
- Postgres (`5432`) and the backend (`8080`) are **not** published on the host; they exist only on the
  internal Docker network. Only Caddy exposes `80`/`443`.
- Actuator `metrics`/`prometheus` stay internal; Caddy proxies only `/api/v1`, `/actuator/health*`,
  `/actuator/info`.
- Single instance is the supported topology (`SACCO_EXPECTED_BACKEND_INSTANCES=1`). A restart/deploy is
  a brief downtime window — deploy off-hours. For zero-downtime later, add a second backend replica +
  Redis (already implemented; flip `SACCO_RATE_LIMIT_STORE`/`SACCO_IDEMPOTENCY_STORE=redis` +
  `SACCO_REDIS_URL`).

## Redeploying later
Use the helper (rebuilds the bundle and the stack):
```bash
./deploy/redeploy.sh
```

### One-time two-SACCO reseed

To remove every SACCO except **A-Z Community Group** and **Mutwe Community Group**, first take a verified
database backup. Set `SACCO_TWO_SACCO_RESEED_ENABLED=true` in `deploy/hetzner.env`, then run
`./deploy/redeploy.sh`. The backend purges all other tenant-owned rows atomically, normalizes the two retained
groups and their branches/subscriptions, and emails fresh temporary passwords to all six officials. Confirm
the backend log contains `Two-SACCO reseed completed`, then immediately set the variable back to `false` and
redeploy. The database event prevents the same reseed version from running twice.
or manually:
```bash
git pull --ff-only
npm ci && npm run build:vite
docker compose --env-file deploy/hetzner.env -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
