---
name: Quote System — Transactions & Number Counter
description: How quote creation is protected against race conditions and partial writes
---

## Rule
Quote creation and update MUST run inside a PDO transaction. Quote numbers use a dedicated `quote_counter` table (single-row, incremented atomically) — never COUNT(*)+1.

**Why:** COUNT+1 duplicates numbers under concurrent requests. Without transactions, a failed item insert leaves an orphaned quote row.

**How to apply:** Any change to quote create/update logic must keep `beginTransaction`/`commit`/`rollBack` wrapper. The `quote_counter` table is initialized in `src/DB.php::migrate()`.

## Status permission matrix (enforced in api/quotes.php::changeStatus)
- admin: any → any
- employee: draft↔sent, draft/sent→cancelled, cancelled→draft
- client: sent→accepted, sent→rejected (only)
