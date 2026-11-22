#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# La VM solo tiene 1 GB de RAM: construir una imagen cada vez evita
# que los builds de Python y Node compitan por la memoria.
docker compose config --quiet
docker compose build api
docker compose build web
docker compose up -d --remove-orphans

# El arranque de la API aplica las migraciones antes de iniciar uvicorn.
for attempt in {1..30}; do
  frontend_status="$(curl --silent --output /dev/null --write-out "%{http_code}" \
    https://habitsquad.austriaeast.cloudapp.azure.com/ || true)"
  api_status="$(curl --silent --output /dev/null --write-out "%{http_code}" \
    https://habitsquad.austriaeast.cloudapp.azure.com/admin/ || true)"
  websocket_status="$(curl --http1.1 --max-time 3 --silent --output /dev/null \
    --write-out "%{http_code}" \
    --header "Connection: Upgrade" \
    --header "Upgrade: websocket" \
    --header "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    --header "Sec-WebSocket-Version: 13" \
    https://habitsquad.austriaeast.cloudapp.azure.com/ws/escuadrones/1/ || true)"
  api_health="$(docker inspect --format '{{.State.Health.Status}}' \
    "$(docker compose ps -q api)" 2>/dev/null || true)"
  redis_health="$(docker inspect --format '{{.State.Health.Status}}' \
    "$(docker compose ps -q redis)" 2>/dev/null || true)"
  worker_status="$(docker inspect --format '{{.State.Status}}' \
    "$(docker compose ps -q worker)" 2>/dev/null || true)"

  if [[ "$frontend_status" == "200" && "$api_status" == "302" \
    && "$websocket_status" == "101" && "$api_health" == "healthy" \
    && "$redis_health" == "healthy" && "$worker_status" == "running" ]]; then
    docker image prune --force
    docker compose ps
    exit 0
  fi

  sleep 2
done

docker compose logs --tail 100 api redis worker web
echo "La comprobación HTTPS del despliegue ha fallado." >&2
exit 1
