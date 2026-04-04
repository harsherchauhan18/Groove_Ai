#!/usr/bin/env bash
# ============================================================
# groove-ai — Database Initialisation Script
# Applies PostgreSQL schema + Neo4j constraints/indexes.
# Run once before starting services for the first time.
# ============================================================
set -euo pipefail

# ── Load .env from project root if present ───────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  echo "📦 Loading environment from $ROOT_DIR/.env"
  set -o allexport
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +o allexport
fi

# ── Defaults ─────────────────────────────────────────────────
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-grooveai}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"

NEO4J_URI="${NEO4J_URI:-bolt://localhost:7687}"
NEO4J_USERNAME="${NEO4J_USERNAME:-neo4j}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:-password}"

# ── PostgreSQL ────────────────────────────────────────────────
echo ""
echo "🐘 Applying PostgreSQL schema..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -f "$ROOT_DIR/database/postgres/schema.sql"

echo "🌱 Running seed data..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -f "$ROOT_DIR/database/postgres/seed.sql"

echo "✅ PostgreSQL setup complete."

# ── Neo4j ─────────────────────────────────────────────────────
if command -v cypher-shell &>/dev/null; then
  echo ""
  echo "🔵 Applying Neo4j constraints..."
  cypher-shell -u "$NEO4J_USERNAME" -p "$NEO4J_PASSWORD" \
    -a "$NEO4J_URI" \
    --file "$ROOT_DIR/database/neo4j/constraints.cypher"

  echo "🔵 Applying Neo4j indexes..."
  cypher-shell -u "$NEO4J_USERNAME" -p "$NEO4J_PASSWORD" \
    -a "$NEO4J_URI" \
    --file "$ROOT_DIR/database/neo4j/indexes.cypher"

  echo "✅ Neo4j setup complete."
else
  echo "⚠️  cypher-shell not found — skipping Neo4j setup. Run manually when ready."
fi

echo ""
echo "🚀 Database initialisation finished."
