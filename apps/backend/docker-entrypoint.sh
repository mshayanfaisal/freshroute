#!/bin/sh
set -e

echo "⏳ Running database migrations..."
npx typeorm-ts-node-commonjs -d src/database/data-source.ts migration:run

if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Seeding database (idempotent)..."
  node -r ts-node/register -r tsconfig-paths/register src/database/seed.ts || echo "Seed skipped/failed (non-fatal)."
fi

echo "🚀 Starting FreshRoute backend..."
exec node dist/main.js
