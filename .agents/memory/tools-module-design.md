---
name: Tools Module Design
description: QRX Tools Management — key decisions for the tools/tool_categories/tool_favorites/tool_usage tables, API routes, and frontend.
---

## Schema design
- toolsTable uses free-form `type` text field (not an enum) so new tool types need no migration.
- toolFavoritesTable and toolUsageTable have composite uniqueIndex on (doctorId, toolId).
- `onConflictDoUpdate` with array target is valid in Drizzle 0.45 for composite unique indexes.

## API design
- Doctor-specific sub-routes (/doctor/tools/favorites, /doctor/tools/recent) are registered BEFORE /tools/:slug to avoid route param collision.
- POST /tools/:id/use returns 401 for non-doctors — consistent auth semantics.
- ensureDefaultCategories() seeds 6 default categories at module load, is a no-op if any rows exist.

## Frontend design
- All React Query hooks are hand-written in artifacts/rxmanager/src/lib/tools-api.ts (no codegen) using direct fetch + localStorage bearer token.
- Sandboxed iframe uses sandbox="allow-scripts allow-forms allow-modals allow-popups" WITHOUT allow-same-origin — this is the critical XSS isolation control.
- srcdoc injects: `<style>CSS</style>` in head + HTML in body + `<script>JS</script>` at body end.
- Radix Select "All X" sentinel: use "_all" string (never empty string ""), map to undefined before passing to hooks.
- JSZip is installed in @workspace/rxmanager for ZIP import/export; import as `import JSZip from "jszip"`.
- AdminToolsPage has Department filter (6-column grid) wired to filterDepartment state and useAdminTools.

**Why free-form type:**
Medical tools evolve — locking to an enum would require DB migrations for every new tool category.

**Why no-codegen hooks:**
Tools API is entirely new and independent; running orval codegen would regenerate and potentially overwrite existing generated files.
