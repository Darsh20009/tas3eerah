---
name: Imported calculator lifecycle
description: Safely mounting individual calculators from an uploaded standalone multi-tool document.
---

When adapting a standalone multi-tool HTML document into independent calculator pages, preserve the shared script declarations but skip initialization for panels that are not mounted.

**Why:** An early initializer touching missing DOM elements aborts the entire script. Later lexical globals remain uninitialized, breaking unrelated calculators and currency switching.

**How to apply:** Guard panel-specific setup at its entry point, including persisted-state restoration and default-row creation. Verify each of the seven calculator pages separately; checking the standalone document alone will not catch this failure.

Per-tool extraction must also preserve or replace shared dialogs and action destinations that live outside the selected panel.

**Why:** Successful calculations and a new toolbar can conceal broken original save/share/print buttons: their report container or sharing screen may have been omitted, or a new requirement may be invisible near the original button.

**How to apply:** Exercise the original inline buttons in each calculator, including per-row actions, opening and submitting sharing, and the actual report preview before printing. Test the generated PDF layout, not just calling window.print directly. Keep feedback beside the action or explicitly visible.

When renaming imported globals, preserve local bindings and their calls consistently.

**Why:** Replacing calls to a formatter without renaming its local declaration can bind an object-formatting call to a different scalar formatter, producing NaN only in reports while calculations remain correct.

**How to apply:** Review both declarations and references when adapting newly uploaded scripts, and assert that every report contains finite displayed prices.
