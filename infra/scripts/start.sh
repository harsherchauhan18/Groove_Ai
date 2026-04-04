#!/usr/bin/env bash
# ============================================================
# groove-ai — Start Script
# Boots all services via Docker Compose with a health check.
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Starting groove-ai services..."

# Pull latest images for infrastructure services
docker compose -f "$ROOT_DIR/docker-compose.yml" pull postgres redis neo4j 2>/dev/null || true

# Build application images
docker compose -f "$ROOT_DIR/docker-compose.yml" build

# Start infrastructure first, wait for health
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d postgres redis neo4j

echo "⏳ Waiting for PostgreSQL to be ready..."
until docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
  pg_isready -U postgres -d grooveai &>/dev/null; do
  sleep 2
done
echo "✅ PostgreSQL is ready."

echo "⏳ Waiting for Redis..."
until docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T redis \
  redis-cli ping 2>/dev/null | grep -q PONG; do
  sleep 2
done
echo "✅ Redis is ready."

# Init databases (idempotent)
bash "$SCRIPT_DIR/init-db.sh" || echo "⚠️  DB init encountered an issue (may already be initialised)."

# Start application services
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d node-api fastapi-engine worker client

echo ""
echo "🎉 All services started!"
echo ""
echo "  Client      → http://localhost:3000"
echo "  Node API    → http://localhost:5000"
echo "  FastAPI     → http://localhost:8000"
echo "  FastAPI docs→ http://localhost:8000/docs"
echo "  Neo4j UI    → http://localhost:7474"
