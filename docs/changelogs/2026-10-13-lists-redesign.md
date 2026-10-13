# Rediseño de listas

**Released:** 2026-10-13

## Summary

El listado y el detalle de listas se rediseñan con `LibraryHero`, tarjetas con vista previa y filas con ratio y estadísticas. Para sostenerlo, la API suma datos que antes calculaba o no tenía el frontend: hasta cuatro ítems de vista previa por lista, progreso en "mis listas" y el estado de seguimiento del visitante en el detalle público. El progreso se unifica en un componente compartido, `ProgressMeter`.

## Highlights

- `list-overview` con hero y tarjetas que muestran visibilidad y progreso.
- `list-detail` con hero, filas con resumen de ratio y estadísticas, y hoja de acciones.
- Vista previa de hasta cuatro juegos por lista desde la API.
- El botón Follow del detalle público refleja si el visitante ya sigue la lista.

## Added

- `GET /lists/me` y `GET /lists/search` devuelven hasta `LIST_PREVIEW_SIZE` (4) ítems de vista previa por lista, con `id`, `code`, `title`, `backgroundUrl` e `isDlc`, ordenados por `position`.
- `GET /lists/me` incluye `progress` por lista, calculado con `listsService.getListProgress`.
- El detalle público de lista (`users-profile.service`) devuelve `isFollowing` calculado para el visitante; es `false` en peticiones anónimas.
- Frontend: `list-item-row` y `shared/components/progress-meter`.

## Changed

- `list-card` muestra visibilidad y progreso.
- `list-overview` y `list-detail` usan `LibraryHero`; el detalle usa `ProgressMeter` y `list-item-row`.
- La pista de `ui-progress` usa el color `line-hover`.
- Colección Bruno actualizada: `get-my-lists`, `search` y `get-user-list-detail`.

## Files of interest

- `apps/api/src/lists/lists.service.ts` — `LIST_PREVIEW_SIZE` y vista previa.
- `apps/api/src/lists/lists.controller.ts` — progreso en mis listas.
- `apps/api/src/users/users-profile.service.ts` — `isFollowing` en el detalle público.
- `apps/web/src/app/features/lists/list-overview/`
- `apps/web/src/app/features/lists/list-detail/`
- `apps/web/src/app/features/lists/list-item-row/`
- `apps/web/src/app/shared/components/progress-meter/progress-meter.ts`

## Commits

- `7a4efdf7` — feat(lists): return up to four preview items per list
- `b7d3c16e` — feat(lists): show visibility and progress on list card
- `1fe05622` — feat(lists): render list overview with library hero and cards
- `8c85f5ed` — feat(lists): add list item row component
- `5e1f8af2` — feat(lists): render list detail with library hero, rows and action sheet
- `34d8403f` — feat(lists): show ratio summary and stats in list item row
- `1b25a49c` — feat(shared): add progress meter component
- `ffd167c3` — refactor(web): use shared progress meter in list detail
- `532d4928` — feat(api): return viewer follow state on public list detail
- `989db855` — feat(lists): include progress in my lists response
- `9dc638c3` — style(web): use line-hover color for progress track
