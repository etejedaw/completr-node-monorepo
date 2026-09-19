# Stats de vistas guardadas (frontend)

**Released:** 2026-06-23

## Summary

Complemento de frontend de `2026-06-23-saved-filter-stats.md`. Cuando hay una vista guardada activa, el backlog muestra un panel de stats con los datos del endpoint de stats: conteos, tasas de completado y abandono, y cards de highlights.

## Added

- Panel de stats en `backlog-list` al activar una saved view.
- Campos nuevos (tasas y highlights) y cards destacadas en el panel.
- Entrada de What's New para el panel.

## Files of interest

- `apps/web/src/app/features/backlog/saved-filters.ts`
- `apps/web/src/app/features/backlog/backlog-list/backlog-list.html`

## Commits

- `16d09560` — feat(backlog): show stats panel when a saved view is active
- `3f89ec66` — feat(backlog): render new stats fields and highlight cards in saved view panel
- `8de95a5f` — docs(whats-new): announce backlog stats panel for saved views
