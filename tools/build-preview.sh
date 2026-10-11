#!/usr/bin/env bash
# Construit un aperçu autonome (un seul fichier HTML, tout embarqué) : tools/build-preview.sh [sortie.html]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; OUT="${1:-$ROOT/../airo-apercu.html}"
TMP="$(mktemp -d)"
npx --yes esbuild@0.24.0 "$ROOT/assets/js/film.js" --bundle --minify --format=iife --outfile="$TMP/exp.bundle.js" --log-level=warning
python3 -I "$ROOT/tools/inline.py" "$ROOT" "$OUT" "$TMP/exp.bundle.js"
