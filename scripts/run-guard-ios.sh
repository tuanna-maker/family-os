#!/usr/bin/env bash
# Chạy STOS Guard như app native trên iOS Simulator (Capacitor).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20 2>/dev/null || true

PORT="${GUARD_DEV_PORT:-8080}"
export CAP_SERVER_URL="http://127.0.0.1:${PORT}/guard"

# Dev server (nền)
if ! curl -sf "http://127.0.0.1:${PORT}/guard" >/dev/null 2>&1; then
  echo "▶ Khởi động dev server tại http://127.0.0.1:${PORT} …"
  npm run dev -- --host 127.0.0.1 --port "$PORT" &
  DEV_PID=$!
  trap 'kill $DEV_PID 2>/dev/null || true' EXIT
  for _ in $(seq 1 40); do
    curl -sf "http://127.0.0.1:${PORT}/guard" >/dev/null 2>&1 && break
    sleep 0.5
  done
fi

echo "▶ Cài/sync iOS (Capacitor) → $CAP_SERVER_URL"
npx cap sync ios

SIM="${IOS_SIMULATOR_ID:-}"
if [ -z "$SIM" ]; then
  SIM=$(xcrun simctl list devices booted -j 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin).get('devices',{})
for run in d.values():
  for dev in run:
    if dev.get('state')=='Booted':
      print(dev['udid']); raise SystemExit
" 2>/dev/null || true)
fi

if [ -n "$SIM" ]; then
  npx cap run ios --target "$SIM"
else
  npx cap run ios
fi
