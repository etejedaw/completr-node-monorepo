# Option picker compartido

**Released:** 2026-10-13

## Summary

Los selectores de opción (vistas, estado, orden, filtros) se unifican en un solo componente, `OptionPicker`, que en móvil abre una hoja inferior y en escritorio puede mostrarse como selector compacto. Es solo frontend. Reemplaza chips y controles propios de cada pantalla. Un fix hace que `ui-bottom-sheet` se monte en el `body`, para que no quede recortado por contenedores con `overflow` o `transform`.

## Highlights

- Un solo componente para elegir opciones en móvil y escritorio.
- Tamaño `md` para los selectores compactos de escritorio.
- La hoja inferior se monta en `document.body` y conserva el foco.

## Added

- `shared/components/option-picker`.
- Tamaño `md` en `option-picker`.

## Changed

- Usan `OptionPicker`: `page-toc`, `platform-filter`, `settings-nav`, `queue-sort-control`, la página de feed, `games-browse`, `user-backlog`, las vistas y estados de `backlog-list`, y el orden de `saved-filters-view` y `tags-page`.
- En escritorio, el filtro del feed, los filtros de `games-browse` y el orden de la cola usan selector compacto.

## Fixed

- `ui-bottom-sheet` se mueve a `document.body` tras renderizar, devuelve el foco al elemento activo y se elimina al destruirse.

## Files of interest

- `apps/web/src/app/shared/components/option-picker/`
- `apps/web/src/app/shared/ui/bottom-sheet/ui-bottom-sheet.ts`
- `apps/web/src/app/features/backlog/backlog-list/`
- `apps/web/src/app/features/games/games-browse/`

## Commits

- `2a1b7601` — feat(shared): add option picker component
- `cebea956` — refactor(shared): use option picker for page toc chips
- `0d32047b` — refactor(shared): use option picker for platform filter
- `d20a63b2` — refactor(settings): use option picker for section nav
- `5d35b6f5` — refactor(web): use option picker in queue sort control
- `e8351500` — refactor(web): use option picker in feed filter
- `7f83179f` — refactor(web): use option picker in games browse filters
- `93665ade` — refactor(web): use option picker in public backlog status filter
- `c34da480` — refactor(web): use option picker in backlog list views and status
- `240c45a4` — feat(shared): add md size to option picker
- `7762907d` — refactor(web): show feed filter as compact picker on desktop
- `c657cc8b` — refactor(web): use compact pickers for desktop games filters
- `6fd3681e` — fix(web): mount bottom sheet on document body
- `6e896774` — refactor(web): use option picker for saved views and tags sort
- `7e059e32` — refactor(web): use compact picker for queue sort on desktop
