# Mood tags (frontend)

**Released:** 2026-06-25

## Summary

Complemento de frontend de `2026-06-25-mood-tags-module.md`. Los mood tags se crean y gestionan en una página propia, se editan desde el backlog y la ficha del juego, y aparecen como chips en todas las vistas de la biblioteca.

## Added

- Servicio `mood-tags`, modelos y componentes compartidos de input y chip.
- Página `/tags` para crear, renombrar, describir y borrar tags, enlazada desde el sidebar.
- Edición y filtro de tags en el modal y el panel lateral del backlog, con chips en cada fila.
- Edición inline de tags en `game-detail`.
- Chips de tags en shelf, cola, wishlist y favoritos.
- Entrada de What's New para mood tags, el orden dinámico del catálogo y las stats configurables.

## Files of interest

- `apps/web/src/app/features/tags/tags-page/tags-page.ts`
- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.ts`

## Commits

- `259523c3` — feat(mood-tags): add service, models and shared input/chip components
- `1a21787c` — feat(tags): add /tags page with create, rename, describe and delete
- `8b67a6f1` — feat(backlog): edit and filter mood tags in modal and side panel, show chips in rows
- `20631786` — feat(games): edit mood tags inline from game-detail
- `67eb9d67` — feat(library): show mood tag chips in shelf, queue, wishlist and favorites
- `082c38e6` — docs(whats-new): announce mood tags, dynamic catalog sort and configurable stats
