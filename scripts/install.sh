#!/bin/bash
# Installs or updates SciCanvas on a Mac from the latest GitHub release:
#   curl -fsSL https://raw.githubusercontent.com/AbdulmateenAderinto/SciCanvas/main/scripts/install.sh | bash
# Picks the Apple-silicon or Intel build, puts SciCanvas.app in /Applications (or ~/Applications if that isn't
# writable; set SCICANVAS_DIR to choose), replacing an older copy. Downloaded this way the app isn't quarantined,
# so it opens without the "unidentified developer" prompt.
set -euo pipefail
REPO=AbdulmateenAderinto/SciCanvas
[ "$(uname)" = Darwin ] || { echo "This installer is for macOS. On Windows, see scripts/install.ps1."; exit 1; }
if pgrep -xq SciCanvas; then echo "SciCanvas is open: quit it, then run this again."; exit 1; fi
ARCH=x64; [ "$(sysctl -in hw.optional.arm64 2>/dev/null)" = 1 ] && ARCH=arm64   # Apple silicon, even under Rosetta
URL=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep -o "https://[^\"]*-$ARCH\.dmg" | head -1 || true)
[ -n "$URL" ] || { echo "The latest release has no Mac installer for $ARCH yet (it may still be building). Try again in a few minutes."; exit 1; }
DEST=${SCICANVAS_DIR:-/Applications}; [ -n "${SCICANVAS_DIR:-}" ] || [ -w "$DEST" ] || DEST="$HOME/Applications"
mkdir -p "$DEST"
TMP=$(mktemp -d); trap 'hdiutil detach -quiet "$TMP/mnt" 2>/dev/null || true; rm -rf "$TMP"' EXIT
echo "Downloading $(basename "$URL")…"
curl -fL --progress-bar -o "$TMP/SciCanvas.dmg" "$URL"
hdiutil attach -quiet -nobrowse -mountpoint "$TMP/mnt" "$TMP/SciCanvas.dmg"
echo "Installing to $DEST…"
ditto "$TMP/mnt/SciCanvas.app" "$DEST/.SciCanvas.app.new"
rm -rf "$DEST/SciCanvas.app" && mv "$DEST/.SciCanvas.app.new" "$DEST/SciCanvas.app"
echo "Installed $(defaults read "$DEST/SciCanvas.app/Contents/Info" CFBundleShortVersionString 2>/dev/null) in $DEST. Open it from Launchpad or Spotlight; it updates itself from now on."
