#!/usr/bin/env bash
# Build & run STOS Family (Expo RN) on iOS Simulator.
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

# Quote-safe path patch for expo-constants (spaces in project path)
CONST_SCRIPT="node_modules/expo-constants/scripts/get-app-config-ios.sh"
if [ -f "$CONST_SCRIPT" ] && grep -q 'basename $PROJECT_DIR' "$CONST_SCRIPT"; then
  sed -i '' 's/basename $PROJECT_DIR/basename "$PROJECT_DIR"/' "$CONST_SCRIPT"
fi

DEVICE="${IOS_SIMULATOR_NAME:-iPhone 17 Pro}"
export REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1
cd mobile/family

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
  echo "export NODE_BINARY=$(command -v node)" > ios/.xcode.env.local
  (cd ios && pod install)
fi

echo "▶ expo run:ios → $DEVICE (tự khởi động Metro)"
exec npx expo run:ios -d "$DEVICE" "$@"
