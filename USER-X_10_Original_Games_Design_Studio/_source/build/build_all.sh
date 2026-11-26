#!/usr/bin/env bash
# Regenerate the whole package from _source/data. BLENDER_PY = python with the bpy module.
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
BLENDER_PY="${BLENDER_PY:-python3}"
"$BLENDER_PY" ../blender/build_games.py
python3 build_game_pdfs.py dims
python3 build_game_pdfs.py docs
python3 master_docs.py
python3 xlsx_build.py
python3 office_build.py
soffice --headless --convert-to pdf --outdir ../../07_Master_Presentation ../../07_Master_Presentation/USER-X_10_Games_Master_Deck.pptx
python3 package.py
python3 qc_xlsx.py
