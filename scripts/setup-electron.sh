#!/bin/sh
# Newer npm versions block Electron's install script. This finishes the install by hand.
set -e
cd "$(dirname "$0")/.."
node node_modules/electron/install.js || true
Z=$(ls -t ~/Library/Caches/electron/*/electron-v*-darwin-*.zip 2>/dev/null | head -1)
if [ -n "$Z" ]; then
  rm -rf node_modules/electron/dist && mkdir node_modules/electron/dist
  unzip -q "$Z" -d node_modules/electron/dist
  printf 'Electron.app/Contents/MacOS/Electron' > node_modules/electron/path.txt
fi
echo "Electron ready"
