---
name: Landing Page Design
description: Clean & Minimal landing page structure, CSS classes, and variables used
---

## Current Landing Page (pages/landing.php)

**Design**: Clean & Minimal — white bg, indigo `#6366f1` accent, dark sidebar in dashboard.

**CSS variables in use (app.css)**:
- `--p` = primary indigo (was `--orange`)
- `--bg` = page background white
- `--surface` = slight grey surface (was `--paper`)
- `--line` = border color
- `--muted`, `--muted2` = secondary text
- `--green`, `--yellow`, `--red` = semantic
- No more `--cyan`, `--orange`, `--paper`, `--ink`

**Key sections in landing.php**:
- `.land-nav` — sticky navbar with `.land-brand`, `.land-nav-links`, `.land-actions`
- `.land-mobile-menu` — hamburger dropdown, toggled via `toggleLandMenu()`/`closeLandMenu()`
- `.hero` — two-column layout: `.hero-content` + `.hero-visual` (`.hero-card-wrap` mock dashboard)
- `.feat-grid` — 6-card features grid
- `.plan-grid` — 3 pricing plan cards (from PLANS constant in config.php)
- `.trust-strip` — CTA banner
- `.about-section` — about with stats and values
- `.contact-section` — contact info + form
- `.land-footer` — 4-column footer grid

**Auth overlay**: `#authOverlay` with login/register tabs + demo buttons (client/employee/admin).
**Policy modal**: `#policyOverlay` with privacy/terms/refund/cookies content inline in JS.

**Language toggle**: `toggleLang()` swaps `data-ar`/`data-en` attributes on all elements.

## Dashboard cleanup done
- `var(--cyan)` → `var(--p)` (line ~388)
- `var(--paper)` → `var(--surface)` (via sed, ~3 occurrences)
