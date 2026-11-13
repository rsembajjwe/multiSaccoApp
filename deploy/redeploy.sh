#!/bin/sh
# Redeploy Tereka Online on the production host.
#
# Pulls the latest committed revision, rebuilds the git-ignored frontend bundle (dist-vite) that Caddy
# serves, then rebuilds and restarts the stack. Run from anywhere inside the repo:
#     ./deploy/redeploy.sh
#
# Assumes the first deploy is done (see deploy/first-deploy.md) and deploy/hetzner.env exists.
set -eu

# Resolve the repo root (this script lives in <repo>/deploy).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="deploy/hetzner.env"
COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.yml -f docker-compose.prod.yml"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found. Copy deploy/hetzner.env.example and fill in secrets first." >&2
    exit 1
fi

echo "==> Pulling latest committed revision"
git pull --ff-only

echo "==> Installing dependencies and rebuilding the production frontend bundle (dist-vite)"
npm ci
npm run build:vite
if [ ! -f dist-vite/index.html ]; then
    echo "ERROR: dist-vite/index.html missing - the frontend build did not produce output." >&2
    exit 1
fi

echo "==> Rebuilding and restarting the stack"
# shellcheck disable=SC2086
$COMPOSE up -d --build

echo "==> Waiting for the backend to report healthy"
DOMAIN_VALUE="$(grep -E '^DOMAIN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')"
ok=0
i=1
while [ "$i" -le 30 ]; do
    if curl -fsS "https://${DOMAIN_VALUE}/actuator/health/readiness" | grep -q '"status":"UP"'; then
        ok=1
        break
    fi
    sleep 5
    i=$((i + 1))
done

# shellcheck disable=SC2086
$COMPOSE ps

if [ "$ok" -eq 1 ]; then
    echo "==> Deploy OK: https://${DOMAIN_VALUE}/actuator/health/readiness is UP"
else
    echo "WARNING: health check did not pass within ~150s. Check logs:" >&2
    echo "  $COMPOSE logs --tail=100 backend" >&2
    exit 1
fi
