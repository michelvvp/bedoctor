#!/usr/bin/env bash
# Atualização de versão no servidor: puxa a branch main do GitHub (quando há
# upstream) e recria o container. Stack isolado (projeto "bedoctor"): nginx com
# o build estático, na porta 8099. Pode rodar duas vezes seguidas.
# Uso:  ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE="docker compose -p bedoctor -f docker-compose.prod.yml"

if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  echo "==> git pull"
  git pull --ff-only
fi

echo "==> build + up (web)"
$COMPOSE up -d --build

echo "==> limpando imagens antigas"
docker image prune -f

echo "==> aguardando health"
for _ in $(seq 1 30); do
  cid=$($COMPOSE ps -q web)
  status=$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo starting)
  [ "$status" = healthy ] && break
  sleep 2
done
$COMPOSE ps
if [ "$status" != healthy ]; then
  echo "ERRO: web não ficou saudável (status: $status)" >&2
  exit 1
fi
echo "OK. App em http://<ip-do-servidor>:${FRONTEND_PORT:-8099}"
