# Stats configurables por vista (frontend)

**Released:** 2026-06-25

## Summary

Complemento de frontend de `2026-06-25-configurable-saved-filter-stats.md`. El panel de stats de cada vista guardada suma una configuración para elegir qué stats mostrar; la selección se guarda en `enabledStats`.

## Added

- Panel de configuración de stats por vista en `backlog-list`.
- `enabledStats` en el modelo `SavedFilter`.

## Files of interest

- `apps/web/src/app/features/backlog/saved-filters.ts`
- `apps/web/src/app/core/models/saved-filter.model.ts`

## Commits

- `791f26fc` — feat(backlog): add per-view stats configuration panel
