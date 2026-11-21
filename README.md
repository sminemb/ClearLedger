# ClearLedger

Personal expenses and monthly budgets with local email/password accounts and SQLite persistence. Plain HTML, CSS, JavaScript, and a Node server; no dependencies or build step.

Requires Node.js 22.18 or newer. Start with `npm start`, then open http://localhost:4173. Stop any old Python/static preview first. If that port is needed elsewhere, use `$env:PORT=4174; npm start` in PowerShell.

Choose **Sign in / create account**. Passwords must contain 12–128 characters. Each account starts with an empty ledger. Transactions, budgets, and currency settings are stored in `data/clearledger.sqlite`. Accounts and seven-day sessions also survive server restarts. Use **Sign out** in the page header or Settings to end the current session. Sample data remains temporary and is never copied into an account.

Tests: `npm test` (or `node --test`). Tests use temporary databases.

## AI Advice

Put `GEMINI_API_KEY=your-api-key` in the project’s `.env` file (ignored by Git), then run `npm start`. ClearLedger loads `.env` at startup, so restart the server after editing it. Use a Gemini API key from a Google Cloud project with active billing. The default model is `gemini-3.5-flash-lite`. To use a different Gemini model that supports structured outputs, set `GEMINI_MODEL`. [Gemini API key setup](https://ai.google.dev/gemini-api/docs/api-key)

Sign in, choose a month with recorded transactions or category budgets, then select **Generate advice** on the **Overview**. The reply contains a summary, observations, and numbered next steps. It is shown for the selected month and stays in the current page session.

Each click sends the selected month, currency, income and expense totals, remaining income, category spending totals, and budget limits to Google Gemini. The API key stays on the server. Account details and individual transactions stay in ClearLedger. Gemini’s paid-service data terms apply to requests made with a billing-enabled project, and API usage may incur charges. [Gemini API data terms](https://ai.google.dev/gemini-api/terms#data-use-paid)

## Reset a forgotten password

1. In **Sign in / create account**, select **Forgot password?**, enter your account email, and select **Get recovery code**.
2. Open the named text file in the ClearLedger project’s `data` folder. Paste its code into the reset form, enter a new password, and select **Reset password**.
3. Sign in with your new password. Resetting the password ends all sessions for that account and preserves the ledger.

A code works once and expires after 15 minutes. Repeating the request while the file’s code is valid keeps that code. Keep the data folder private. Anyone who can read the recovery file can use its code while it is valid.

## Existing browser records

Your old `clearledger-v1` browser records remain untouched. After signing in to a new account, choose **Settings → Import legacy browser records** and confirm. Import requires an untouched account ledger and the same browser and exact site address as the old app (including hostname and port). If no records are found, return to the old address to download a JSON backup. JSON downloads are archival; there is no general JSON upload interface.

## Backups and boundaries

Export transactions as CSV or download a full ledger JSON backup in Settings. To back up all accounts, stop the server and copy `data/clearledger.sqlite` to a safe location. The database contains private financial records and password hashes; protect it with your operating-system account and disk encryption. Database files are excluded from Git and cannot be served by the app.

The server listens only on loopback. Accounts are local to this server, with no cloud syncing, email verification, password-reset email, or bank connection. Emails are account identifiers only. Do not expose this HTTP server to a network. Local cookies are HTTP-only and SameSite=Strict; hosting would require HTTPS, secure cookies, and a separate deployment review. Anyone with access to your OS files can read the database.

Saves validate the existing ledger model on the server, enforce account ownership, and use revisions to reject stale writes. If a save conflicts, download a backup before reloading. Currency changes relabel amounts without conversion. Ledger requests are limited to 2 MiB; auth attempts are limited to 20 per 15 minutes per local address (reset when the server restarts). Node 22 may print an experimental SQLite warning.
