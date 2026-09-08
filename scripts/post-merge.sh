#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f composer.json ]]; then
  composer_args=(
    install
    --no-interaction
    --no-progress
    --prefer-dist
    --optimize-autoloader
  )

  # Replit's local PHP runtime does not include the optional MongoDB
  # extension. The package remains installed for deployments that enable it.
  if ! php -m | grep -qi '^mongodb$'; then
    composer_args+=(--ignore-platform-req=ext-mongodb)
  fi

  composer "${composer_args[@]}"
fi

php -l router.php
php -l config.php

if [[ -d api || -d pages || -d src ]]; then
  find api pages src -type f -name '*.php' -print0 2>/dev/null \
    | xargs -0 -r -n1 php -l
fi

echo "Post-merge setup completed successfully."