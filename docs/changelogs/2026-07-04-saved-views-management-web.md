# Gestión de vistas guardadas (frontend)

**Released:** 2026-07-04

## Summary

Frontend de `2026-07-03-saved-view-ordering.md` y `2026-07-03-saved-filter-appearance.md`, más funciones que no necesitaron cambios en el backend. Aplicar filtros guarda la vista automáticamente, las vistas fijadas se reordenan arrastrando, y la página de gestión permite ordenar, duplicar, compartir y personalizar cada vista.

## Added

- Al aplicar filtros se guarda la vista, con un switch para fijarla al backlog.
- Orden persistente de las vistas fijadas, con drag-and-drop en los chips del backlog.
- Orden no persistente ("sort by") en la página de vistas guardadas.
- Duplicar una vista desde un modal que pide el nombre.
- Compartir un enlace público al backlog filtrado por la vista; el backlog del perfil público aplica esos filtros.
- Selector de ícono y color por vista (`saved-filter-appearance.ts`), aplicado en chips y cards.
- Aviso del límite free con toast y banner de vistas congeladas.

## Fixed

- El control de fijar al backlog usa un label de switch.

## Files of interest

- `apps/web/src/app/features/backlog/saved-filters-view/saved-filters-view.ts`
- `apps/web/src/app/features/backlog/saved-filter-appearance.ts`
- `apps/web/src/app/features/public-profile/user-backlog/user-backlog.ts`

## Commits

- `52592b38` — feat(backlog): auto-save view on apply with pin toggle
- `c032939c` — feat(saved-views): add non-persistent sort by control
- `6a0dcc90` — feat(backlog): reorder pinned saved views with persistent order
- `976cea06` — feat(saved-views): surface free limit with toast and frozen banner
- `9643bd99` — feat(saved-views): duplicate a view via a name modal
- `0e99ce36` — feat(saved-views): share a public backlog link from a view
- `32bfee7d` — feat(saved-views): pick and render view icon and color
- `708504e9` — feat(backlog): drag-and-drop to reorder pinned views
- `bbe85f36` — fix(backlog): use switch label for pin-to-backlog control
