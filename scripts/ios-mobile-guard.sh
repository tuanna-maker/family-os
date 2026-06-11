#!/usr/bin/env bash
# Build & run STOS Guard (Expo RN) on iOS Simulator.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 20.20.2 >/dev/null 2>&1 || true
nvm use 20.20.2

node scripts/ensure-mobile-node-modules.mjs
node scripts/sync-mobile-env.mjs

DEVICE="${IOS_SIMULATOR_NAME:-iPhone 17 Pro}"
PORT="${EXPO_METRO_PORT:-8082}"
export REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1
cd mobile/guard

if [ ! -d ios/Pods ]; then
  echo "▶ expo prebuild (ios)…"
  npx expo prebuild --platform ios
  cat > ios/Podfile.properties.json <<'JSON'
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "expo.inlineModules.watchedDirectories": "[]",
  "ios.buildReactNativeFromSource": "true",
  "ios.useFrameworks": "static"
}
JSON
  node "$ROOT/scripts/patch-expo-ios-dev.mjs" mobile/guard "$PORT"
  (cd ios && pod install)
else
  node "$ROOT/scripts/patch-expo-ios-dev.mjs" mobile/guard "$PORT"
fi

echo "▶ expo run:ios → $DEVICE (Metro port $PORT)"
exec npx expo run:ios -d "$DEVICE" --port "$PORT" "$@"
