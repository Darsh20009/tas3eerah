---
name: Imported calculator lifecycle
description: Safely mounting individual calculators from an uploaded standalone multi-tool document.
---

When adapting a standalone multi-tool HTML document into independent calculator pages, preserve the shared script declarations but skip initialization for panels that are not mounted.

**Why:** An early initializer touching missing DOM elements aborts the entire script. Later lexical globals remain uninitialized, breaking unrelated calculators and currency switching.

**How to apply:** Guard panel-specific setup at its entry point, including persisted-state restoration and default-row creation. Verify each of the seven calculator pages separately; checking the standalone document alone will not catch this failure.
