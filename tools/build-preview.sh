#!/usr/bin/env bash
# Construit un aperçu autonome (un seul fichier HTML, tout embarqué) : tools/build-preview.sh [sortie.html]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; OUT="${1:-$ROOT/../airo-apercu.html}"
TMP="$(mktemp -d)"; V="$ROOT/assets/vendor/three"
for f in showroom world; do sed "s#\"three/addons/#\"$V/addons/#g" "$ROOT/assets/js/$f.js" > "$TMP/$f.js"; done
sed "s#\"three/addons/#\"$V/addons/#g" "$ROOT/assets/js/experience.js" > "$TMP/exp.js"
npx --yes esbuild@0.24.0 "$TMP/exp.js" --bundle --minify --format=iife --alias:three="$V/three.module.min.js" --outfile="$TMP/exp.bundle.js" --log-level=warning
python3 -I "$ROOT/tools/inline.py" "$ROOT" "$OUT" "$TMP/exp.bundle.js"
