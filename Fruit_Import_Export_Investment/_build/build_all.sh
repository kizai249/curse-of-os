#!/usr/bin/env bash
# Rebuild every deliverable from the single engine and run all QA. Run from Fruit_Import_Export_Investment/.
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
echo "1/6 engine → model_output.json";      node build_data.js
echo "2/6 Excel model + assumptions";       python3 build_xlsx.py
echo "3/6 QA: Excel recalculation vs engine"; python3 qa_excel.py > /dev/null && echo "   ok"
echo "4/6 QA: deck in Chromium + deck PDF"; node qa_deck.js > /dev/null && node -e "const r=require('./qa_deck_result.json');if(r.errors.length){console.error(r.errors);process.exit(1)}console.log('   ok')"
echo "5/6 documents + PDFs";                 node build_docs.js > /dev/null
echo "6/6 audit report + README";           node build_audit.js && node build_docs.js > /dev/null
cp ../05_Documentation/README.md ../README.md
echo "done"
