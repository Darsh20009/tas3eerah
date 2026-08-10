---
name: System Architecture
description: هيكل النظام الكامل — PHP + SQLite + ملفات منفصلة
---

## Architecture

PHP 8.4 built-in server via `router.php` on port 5000.

## File Structure
- `router.php` — Entry point, routes URLs to pages or API files
- `config.php` — App constants + PLANS array (pricing tiers)
- `src/DB.php` — SQLite3 wrapper, auto-creates tables + seeds on first run
- `src/Auth.php` — Session auth (bcrypt, PHP sessions)
- `src/Response.php` — JSON response helper
- `api/auth.php` — login/register/logout/demo/me
- `api/quotes.php` — Full CRUD for quotes + items
- `api/messages.php` — inbox/thread/send/contacts
- `api/admin.php` — user management + subscriptions + stats + activity log
- `pages/landing.php` — Landing page (Arabic RTL, with auth overlay)
- `pages/dashboard.php` — Main app (PHP renders initial stats server-side, JS handles nav + API)
- `assets/css/app.css` — All styles (~650 lines, custom design system)
- `assets/js/app.js` — All frontend logic (~550 lines, vanilla JS)
- `database/tas3eerah.db` — SQLite3 database (auto-created)

## Database Tables
users, quotes, quote_items, messages, activity_log

## Demo Credentials
- admin@tas3eerah.com / Admin@2025 (enterprise plan)
- employee@tas3eerah.com / Demo@2025 (pro plan)
- client@tas3eerah.com / Demo@2025 (free plan)

**Why:** User wanted a real system from scratch, not a single-file prototype.
**How to apply:** Add new features as new api/ endpoint files, reference via router.php.
