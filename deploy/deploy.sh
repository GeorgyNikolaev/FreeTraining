#!/usr/bin/env bash
# Выкладка на сервер с локальной машины: ./deploy/deploy.sh
# Только курсы, без пересборки: ./deploy/deploy.sh content
set -euo pipefail

SERVER="${SERVER:-root@85.235.205.47}"
REMOTE_DIR=/opt/freetraining
cd "$(dirname "$0")/.."

sync_content() {
  rsync -az --no-owner --no-group --delete --exclude .DS_Store content/ "$SERVER:$REMOTE_DIR/content/"
}

if [[ "${1:-}" == "content" ]]; then
  sync_content
  echo "Курсы обновлены."
  exit 0
fi

(cd frontend && npm run build)

ssh "$SERVER" "mkdir -p $REMOTE_DIR/{backend,content,deploy,frontend/dist}"
rsync -az --no-owner --no-group --delete --exclude-from=backend/.dockerignore backend/ "$SERVER:$REMOTE_DIR/backend/"
sync_content
rsync -az --no-owner --no-group --delete frontend/dist/ "$SERVER:$REMOTE_DIR/frontend/dist/"
rsync -az --no-owner --no-group --exclude .env deploy/ "$SERVER:$REMOTE_DIR/deploy/"

ssh "$SERVER" "cd $REMOTE_DIR/deploy && docker compose up -d --build && docker image prune -f >/dev/null && systemctl reload caddy"
echo "Готово: https://learningfree.ru"
