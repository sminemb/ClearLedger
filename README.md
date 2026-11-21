# ClearLedger

Personal expenses and monthly budgets with local email/password accounts and SQLite persistence. Plain HTML, CSS, JavaScript, and a Node server; no dependencies or build step.

Requires Node.js 22.18 or newer. Start with `npm start`, then open http://localhost:4173. Stop any old Python/static preview first. If that port is needed elsewhere, use `$env:PORT=4174; npm start` in PowerShell.

Choose **Sign in / create account**. Passwords must contain 12–128 characters. Each account starts with an empty ledger. Transactions, budgets, and currency settings are stored in `data/clearledger.sqlite`. Accounts and seven-day sessions also survive server restarts. Use **Sign out** in the page header or Settings to end the current session. Sample data remains temporary and is never copied into an account.

Tests: `npm test` (or `node --test`). Tests use temporary databases.

## Reset a forgotten password

1. On the computer running ClearLedger, open a terminal in the project folder and run `npm run recovery-code -- you@example.com` with your account email. The command requires access to the local database.
2. In **Sign in / create account**, select **Forgot password?** Enter your account email, the code printed in the terminal, and a new password.
3. Sign in with your new password. Resetting the password ends all sessions for that account and preserves the ledger.

A code works once and expires after 15 minutes. Generating a new code replaces the previous one. Keep the code private.

## Existing browser records

Your old `clearledger-v1` browser records remain untouched. After signing in to a new account, choose **Settings → Import legacy browser records** and confirm. Import requires an untouched account ledger and the same browser and exact site address as the old app (including hostname and port). If no records are found, return to the old address to download a JSON backup. JSON downloads are archival; there is no general JSON upload interface.

## Backups and boundaries

Export transactions as CSV or download a full ledger JSON backup in Settings. To back up all accounts, stop the server and copy `data/clearledger.sqlite` to a safe location. The database contains private financial records and password hashes; protect it with your operating-system account and disk encryption. Database files are excluded from Git and cannot be served by the app.

The server listens only on loopback. Accounts are local to this server, with no cloud syncing, email verification, password-reset email, or bank connection. Emails are account identifiers only. Do not expose this HTTP server to a network. Local cookies are HTTP-only and SameSite=Strict; hosting would require HTTPS, secure cookies, and a separate deployment review. Anyone with access to your OS files can read the database.

Saves validate the existing ledger model on the server, enforce account ownership, and use revisions to reject stale writes. If a save conflicts, download a backup before reloading. Currency changes relabel amounts without conversion. Ledger requests are limited to 2 MiB; auth attempts are limited to 20 per 15 minutes per local address (reset when the server restarts). Node 22 may print an experimental SQLite warning.
