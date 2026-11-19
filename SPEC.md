# ClearLedger — Personal Expense & Budget Tracker V1

Status: approved by the user on November 19, 2026

## Objective

Build a responsive web app for one person to record income and expenses, understand monthly spending, and stay within category budgets.

Confirmed by the user: records are saved in the browser. No sign-in or cross-device syncing is required for V1.

## First version

- A monthly overview shows income, expenses, remaining income, and spending by category. All totals come from recorded transactions.
- Add, edit, and delete transactions with a description, amount, date, income/expense type, and category. Confirm deletion.
- Browse transactions for a selected month, search descriptions, and filter by category or transaction type.
- Set a spending limit for each category for the selected month. Show spending, remaining budget, and clear over-budget states. Income does not count against expense budgets.
- Keep transactions, budgets, and currency settings after refreshing the page.
- Export recorded transactions as CSV.
- Offer clearly labeled sample data for trying the app. Starting with personal data leaves the sample data behind.

Proposed defaults: the working name is ClearLedger; currency initially uses USD and can be changed to PHP, EUR, or GBP without converting recorded amounts. These are implementation defaults, not confirmed preferences.

## Tech stack

Proposed: plain HTML, CSS, and JavaScript using browser localStorage, with no runtime dependencies. This fits the confirmed browser-saved scope. The user may request a framework before implementation.

Keep this project local. Do not use Sites or publish automatically. Deployment requires a new explicit request from the user. Records stay in the browser used to enter them.

## Commands

- Preview: `python -m http.server 4173 --directory dist`
- Test: `node --test`
- Build: none; `dist/` contains the deployable application.

## Project structure and style

- `dist/index.html`: accessible app shell and forms.
- `dist/styles.css`: responsive layout and interaction states.
- `dist/app.js`: UI, browser persistence, and exports.
- `dist/model.mjs`: validated transaction data and financial calculations.
- `tests/model.test.mjs`: focused checks for data and calculations.
- `.openai/hosting.json`: legacy identity for the earlier Sites publication; retained for reference only, not authorization to publish.

Use native form controls, named JavaScript functions, and authored SVG icons. Reuse the same calculation and validation functions across forms, summaries, and export. Store monetary amounts as integer minor units to avoid floating-point rounding errors.

## Validation and boundaries

Always validate amounts, dates, categories, and restored browser data. Render transaction descriptions as text. If saving fails, show an actionable error and retain the previous saved state. CSV export must handle quotes, commas, newlines, and spreadsheet formula prefixes safely.

Never overwrite malformed saved data silently, present samples as personal records, send financial records to a server, or silently change the Site's audience.

Test financial totals, month boundaries, category budgets, invalid records, and CSV escaping. Verify the main entry/edit/delete flow, persistence after reload, keyboard access, and desktop/mobile layouts in a browser when available.

## Success criteria

1. A new user can start empty, enter a transaction, and see the correct monthly totals.
2. Editing or deleting a transaction updates every affected total and category budget.
3. Changing the month and filters produces the corresponding records and summaries, including useful empty states.
4. Budgets and transactions survive a reload; storage errors are visible.
5. Amount calculations remain exact to the minor unit, including at budget boundaries.
6. The app works at phone and desktop widths with visible labels, keyboard focus, and accessible error messages.
7. Export downloads a valid CSV containing the user's transactions.

## Deferred

Bank connections, account login, cloud syncing, shared households, recurring transaction automation, receipt uploads, currency conversion, and AI advice. None is needed for the confirmed browser-saved first version.

## Open decisions

The user approved the first-version scope and dependency-free stack. Currency and working name can be changed without expanding the scope.
