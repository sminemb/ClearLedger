# ClearLedger

Personal expenses and monthly budgets, stored in your browser. Plain HTML, CSS and JavaScript; no install or build step.

Preview: `python -m http.server 4173 --directory dist`

Tests: `node --test`

Open http://localhost:4173. Explore the labeled sample data, then choose **Start fresh** to begin your personal ledger. Click any transaction description to edit or delete it. Set monthly category limits under Budgets. Settings offers display currency, CSV export, and full JSON backup downloads.

Records are specific to the browser and site address. Clearing site data removes them. Sample changes are temporary. Currency changes relabel amounts without conversion. JSON downloads are archival backups; V1 does not include a backup-import interface.
