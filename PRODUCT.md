# ClearLedger

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain HTML, CSS, and JavaScript, with a local Node.js server and SQLite.

## Users

One person recording personal income and expenses and planning monthly budgets.

## Product Purpose

Make monthly spending and remaining category budgets clear, with quick transaction entry and editing.

## Capabilities and Constraints

Account-scoped SQLite records, monthly summaries, category budgets, searchable transactions, CSV export, and clearly labeled sample data. No bank connection or cloud syncing. USD is the initial currency; PHP, EUR, and GBP are available without conversion. Local-only development and previews. Do not use Sites or deploy automatically.

## Evidence on Hand

No personal financial records were supplied. All sample transactions must be labeled demonstration data.

## Product Principles

- Financial calculations use integer minor units.
- Keep user records on the local server and make save failures visible.
- Optimize for daily entry and monthly review on phone and desktop.
