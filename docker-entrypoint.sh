#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Applying database migrations..."
  npx prisma migrate deploy

  echo "Checking database state and auto-seeding 100+ records if needed..."
  npx tsx scripts/seed-100.ts || true
fi

exec node server.js
