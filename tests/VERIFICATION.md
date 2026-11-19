# V1 verification

- `node --test`: four passing cases covering exact money parsing, month and category totals, restored-data validation, and safe CSV cells.
- `node --check dist/app.js`: passed.
- Browser: created and edited a sample transaction; searched transactions; started a personal ledger; created a synthetic record and verified it after reload; deleted it through confirmation; saved a category budget and verified it after reload.
- Console: no captured errors or warnings during the tested flows.
- Layout: desktop 1536 × 1024 and phone 390 × 844; phone document width did not exceed viewport. Final screenshots in ignored `.impeccable/review/`.
- Design detector: ran once; hover contrast and habit line height findings corrected.
- Not exercised: actual storage quota exhaustion, assistive technology, full browser compatibility, or programmatic comparison against the mockup. Browser storage failure handling was reviewed in source.

The app's preview test records use a different browser origin from the deployed Site and are not shipped as personal records.
