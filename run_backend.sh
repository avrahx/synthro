#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Synthro Backend — Quick Start Script
# Usage: bash run_backend.sh [--prod] [--port 8000]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"

PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"
RELOAD="--reload"

# Parse flags
for arg in "$@"; do
  case "$arg" in
    --prod)   RELOAD="" ;;
    --port=*) PORT="${arg#*=}" ;;
    --port)   shift; PORT="$1" ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          SYNTHRO HYPERVAULT ALPHA — BACKEND              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  ▶ Directory : ${BACKEND_DIR}"
echo "  ▶ Host      : ${HOST}:${PORT}"
echo "  ▶ Reload    : ${RELOAD:-off (production)}"
echo "  ▶ Docs      : http://localhost:${PORT}/docs"
echo ""

cd "${BACKEND_DIR}"

# Create virtual environment if not present
if [ ! -d ".venv" ]; then
  echo "  Creating virtual environment..."
  python3 -m venv .venv
fi

# Activate venv
# shellcheck disable=SC1091
source .venv/bin/activate

# Install / upgrade dependencies
echo "  Installing dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

echo ""
echo "  Starting uvicorn..."
echo ""

# Run uvicorn
# shellcheck disable=SC2086
exec uvicorn app.main:app \
  --host "${HOST}" \
  --port "${PORT}" \
  ${RELOAD} \
  --log-level info \
  --access-log
