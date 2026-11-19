# Transaction editor save guard — November 19, 2026

- `npm test`: all 7 tests passed. The new delayed-response regression failed before the fix when Cancel closed a saving editor; it now covers close/Escape guards, reopening, repeated submit, control locking, successful completion, and failed-save retry with the draft preserved.
- Headless Chromium with an isolated in-memory SQLite database: delayed create, update, and delete kept the editor locked; Escape was blocked during saves and worked afterward. A newer draft remained open, and a failed update preserved its values for retry. Reload confirmed the retried update persisted. No unexpected browser errors were captured.
- `node --check dist/app.js` and `git diff --check`: passed. No dependencies were added. Firefox and Safari were not checked.

# Local authentication update — November 19, 2026

- `node --test`: 5 passing tests, including an HTTP/SQLite integration test for account isolation, hashed password storage, Unicode data, conflict rejection, changed-account rejection, expired sessions, logout, auth throttling, and persistence across server restart.
- Browser verification used an isolated database: created an account, saved a transaction, reloaded, saved a budget and currency, signed out, and signed back in. The transaction, budget, and currency returned correctly.
- Legacy browser import was reviewed in source; it was not exercised against personal browser data. No hosting or cloud service was used.
- Earlier verification notes below describe the previous browser-storage version.

# V1 verification

- `node --test`: four passing cases covering exact money parsing, month and category totals, restored-data validation, and safe CSV cells.
- `node --check dist/app.js`: passed.
- Browser: created and edited a sample transaction; searched transactions; started a personal ledger; created a synthetic record and verified it after reload; deleted it through confirmation; saved a category budget and verified it after reload.
- Console: no captured errors or warnings during the tested flows.
- Layout: desktop 1536 × 1024 and phone 390 × 844; phone document width did not exceed viewport. Final screenshots in ignored `.impeccable/review/`.
- Design detector: ran once; hover contrast and habit line height findings corrected.
- Not exercised: actual storage quota exhaustion, assistive technology, full browser compatibility, or programmatic comparison against the mockup. Browser storage failure handling was reviewed in source.

The app's preview test records use a different browser origin from the deployed Site and are not shipped as personal records.
