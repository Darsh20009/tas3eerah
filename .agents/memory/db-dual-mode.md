---
name: Dual-mode DB (MongoDB / SQLite)
description: DB.php automatically selects MongoDB in production and SQLite locally — same public interface.
---

## Rule
`DB::isMongo()` returns true **only** when **both**:
1. `ext-mongodb` PHP extension is loaded (not available in Replit NixOS, only in Docker)
2. `MONGODB_URI` env var is non-empty

## Interface (unchanged for all callers)
`insertDoc`, `findOne`, `findAll`, `count`, `updateDoc`, `deleteDoc`, `aggregate`, `sumField`, `nextQuoteNumber`

## SQLite specifics
- Schema auto-created in `database/tas3eerah.db` (path from `DB_PATH` constant in config.php)
- `items` field in quotes stored as JSON TEXT — decoded automatically on read
- `_counters` table used for sequential IDs and quote numbers (mirrors MongoDB's `_counters` collection)
- Filter-to-SQL translator handles: `$or`, `$and`, `$in`, `$ne`, `$regex` (LIKE), `$gte/$lte/$lt`, null
- `aggregate()` in SQLite mode translates `$match`, `$lookup` (LEFT JOIN), `$addFields` (`$arrayElemAt`), `$sort`, `$limit` — enough for all current pipelines

## MongoDB specifics
- Atlas URI from `MONGODB_URI` env var
- `_counters` collection with `$inc + upsert` for atomic sequential IDs
- Items embedded in quotes documents (no separate collection)
- Requires `ext-mongodb` PHP extension + `mongodb/mongodb ^1.19` Composer package

**Why:** Replit NixOS cannot install ext-mongodb (pecl fails, nix store immutable). Docker (Render) installs it via Dockerfile. Dual-mode lets local dev use SQLite while production uses MongoDB Atlas for persistence.

## Dockerfile ext-mongodb version — MUST PIN
`pecl install mongodb` installs 2.x (latest). `mongodb/mongodb ^1.19` requires `ext-mongodb ^1.x` — version mismatch kills the Composer step.
**Always use**: `pecl install mongodb-1.21.0` in the Dockerfile.
If upgrading the PHP library to `^2.0`, remove the pin and test API compatibility (FindOneAndUpdate constants, typeMap, etc.).

**How to apply:** Never check for MongoDB extension directly in business code. Always go through `DB::*` methods. If a new method is needed, add both a MongoDB and SQLite implementation.
