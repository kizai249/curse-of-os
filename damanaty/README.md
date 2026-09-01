# Damanaty (ضماناتي) — prototype

A working prototype of the Damanaty product-ownership app, built per the
[Damanaty Evolution Blueprint](../) product-evolution spec. This folder is
unrelated to the "Curse of Os" game elsewhere in this repository — kept
side by side rather than mixed in, since the two are separate products
that happen to share a GitHub repo.

## Why this exists

This repo had no existing Damanaty codebase to inspect or evolve. Given
the choice to attempt implementation anyway, this is a from-scratch,
client-only build of the Year 1 ("Foundation") feature set from the
roadmap: product registration, warranty tracking, documents, maintenance/
service records, claims, a rule-based insight engine, a health score, a
timeline, and a Product Passport view.

## What's real vs. not

- **Real:** all warranty math, health scoring, and AI insights are computed
  from data you actually enter — nothing is fabricated. If there isn't
  enough data, the UI says so ("بيانات غير كافية" / insufficient data)
  instead of showing a fake number.
- **Not implemented (marked "قريبًا" / planned in the UI):** OCR/invoice
  scanning, barcode/QR capture, retailer/manufacturer/service-center
  integrations, and anything from Years 2–5 of the roadmap. These are
  shown only on the in-app "Future" (roadmap) screen, clearly separated
  from what actually works today.

## Running it

Static files, no build step or backend:

```
cd damanaty
python3 -m http.server 8000
# open http://localhost:8000
```

Data is stored in the browser's `localStorage` only (key `damanaty_v1`) —
there is no server or database behind this prototype.
