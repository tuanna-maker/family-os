#!/usr/bin/env bash
# Metro bundler cho STOS Family — GIỮ terminal này mở khi dev trên Simulator.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20.20.2

node scripts/ensure-mobile-node-modules.mjs
node scripts/sync-mobile-env.mjs

PORT="${EXPO_METRO_PORT:-8081}"
export REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1

echo "▶ Metro STOS Family → http://127.0.0.1:${PORT}"
echo "   (Mở Simulator và nhấn ⌘R sau khi thấy 'Waiting on')"
cd mobile/family
exec npx expo start --port "$PORT" --clear "$@"
