# Hetzner CX22 Deployment

Use this runbook for the low-budget single-server deployment of `tereka.online`.

## Target Shape

- One Hetzner Cloud CX22 Ubuntu server.
- Docker Compose runs PostgreSQL, the Java backend, and Caddy.
- Caddy serves the frontend at `https://tereka.online`.
- Caddy proxies `https://tereka.online/api/v1` to the Java backend.
- Caddy obtains and renews HTTPS certificates automatically.

## DNS

In Afriregister DNS, create these records after Hetzner gives you the server IP:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | Hetzner IPv4 address |
| A | `www` | Hetzner IPv4 address |

The app uses the root domain. `www.tereka.online` can be redirected later if needed.

## Server Setup

SSH into the VPS as root, then install Docker:

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl git nodejs npm ufw
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Open only SSH, HTTP, and HTTPS:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

## Deploy

Clone the repository:

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/rsembajjwe/multiSaccoApp.git saccoApp
cd /opt/saccoApp
```

Create the untracked environment file:

```bash
cp deploy/hetzner.env.example .env
nano .env
```

Before starting, replace:

- `POSTGRES_PASSWORD` with a unique 24+ character password.
- `ACME_EMAIL` with your real certificate contact email.
- Provider values when real SMS, email, or mobile-money adapters are ready.

Confirm the preflight:

```bash
npm run staging:preflight
```

Start the production stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Check health:

```bash
curl -fsS https://tereka.online/api/v1/health
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

## Update Deployment

```bash
cd /opt/saccoApp
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Backups

Create a backup before every update:

```bash
set -a
. ./.env
set +a
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "sacco_app_$(date +%Y%m%d_%H%M%S).dump"
```

Copy backups off the server regularly. The cheapest first step is to download them to your local machine after each release.

## Logs

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f postgres
```

## Stop

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```
