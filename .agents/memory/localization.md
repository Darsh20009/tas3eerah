---
name: Localization
description: Durable rules for the Arabic and English interface behavior
---

The Arabic and English interface share one persisted language choice. Translation of generated UI must preserve user-entered names, quote titles, messages, and other records; those values are not interface copy.

**Why:** Broad text replacement can corrupt user data and duplicate English/Arabic reverse mappings can prevent a clean round trip when users switch back.

**How to apply:** Keep canonical first-value reverse mappings for duplicate translations, use boundary-aware replacements, mark user content with `user-content`, and disconnect the DOM observer while applying a language change.