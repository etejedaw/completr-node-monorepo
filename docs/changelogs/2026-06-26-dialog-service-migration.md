# Modales sobre DialogService

**Released:** 2026-06-26

## Summary

Cada modal se montaba en el template del padre con un `@if` y señales de apertura propias. Ahora un `DialogService` sobre el dialog manager de ng-primitives abre los modales por código, y todos los modales de la app migran a él. El primitivo `UiDialog` queda sin uso y se elimina. En la misma tanda, `game-filter-panel` pasa a usar `NgpToggleGroup`.

## Added

- `core/services/dialog.ts`: `DialogService` sobre el dialog manager de ng-primitives.

## Changed

- Migran a `DialogService` los modales de backlog, listas, wishlist (agregar y plataforma), cola, game-shelf, favoritos, `game-detail` y la lista de usuarios del perfil.
- `game-filter-panel` usa `NgpToggleGroup`.

## Removed

- Primitivo `UiDialog` y sus estilos en `ui.css`.

## Fixed

- El resaltado de los ítems del toggle group usa `data-selected`.

## Files of interest

- `apps/web/src/app/core/services/dialog.ts`
- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.ts`
- `apps/web/src/app/shared/components/game-filter-panel/game-filter-panel.ts`

## Commits

- `7ba4c587` — feat(ui): add DialogService over ng-primitives dialog manager
- `775b7281` — refactor(backlog): migrate backlog modal to ng-primitives dialog
- `8676735a` — refactor(lists): open list and backlog modals via DialogService
- `50a52df1` — refactor(wishlist): migrate add and platform modals to DialogService
- `b9791880` — refactor(queue): migrate add modal to DialogService
- `03ac942a` — refactor(game-shelf): migrate shelf and backlog modals to DialogService
- `c3e58893` — refactor(favorites): open backlog modal via DialogService
- `407d82d4` — refactor(backlog): open backlog modal from list via DialogService
- `99d5d53a` — refactor(games): migrate game-detail modals to DialogService
- `1f9923f1` — refactor(profile): migrate user list modal to DialogService
- `3cabe258` — refactor(filters): use NgpToggleGroup in game-filter-panel
- `4f216b71` — chore(ui): remove unused UiDialog primitive
- `ad940f7d` — fix(filters): use data-selected for toggle-group item highlight
