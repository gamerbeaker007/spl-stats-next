#!/bin/sh
set -e

echo "Starting worker..."
exec npx tsx --tsconfig scripts/tsconfig.json scripts/worker.ts
