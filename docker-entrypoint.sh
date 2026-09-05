#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  npx prisma migrate deploy
  if [ "${SEED_DATABASE:-true}" = "true" ]; then
    npx tsx prisma/seed.ts
  fi
fi

exec node server.js
