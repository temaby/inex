---
title: 'Select transaction type from a dropdown'
type: 'feature'
created: '2026-10-24'
status: 'done'
route: 'one-shot'
---

# Select transaction type from a dropdown

## Intent

**Problem:** Five transaction types crowd the compact segmented control in the create drawer.

**Approach:** Replace it with a labeled, full-width Ant Design Select before the transaction fields. Preserve all five options, the default expense mode, and existing mode-change/reset behavior. Reuse existing English/Russian labels.

## Suggested Review Order

1. [Create form](../../inex/ClientApp/src/pages/Transactions/TransactionCreate.tsx) — labeled dropdown and typed mode handler.
2. [Existing form tests](../../inex/ClientApp/src/pages/Transactions/TransactionCreate.test.tsx) — dropdown interaction with validation and submission coverage.
3. [Visual QA scenarios](../../inex/ClientApp/visual-qa/transactions.mjs) — exercise all five modes and capture the expanded list at four widths plus Russian at 360px. Dedicated output directory preserves other scenarios' evidence.
4. [Visual QA evidence](visual-qa/transaction-type-dropdown/qa-summary.json) — fixture mode; no real backend/provider calls. Build, lint, and nine create-form tests passed.
