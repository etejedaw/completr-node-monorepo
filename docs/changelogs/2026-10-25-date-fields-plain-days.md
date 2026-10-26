# Fechas de los formularios como día, sin hora

**Released:** 2026-10-25

## Summary

Al elegir una fecha en un campo vacío del modal de runs (`startedAt`, `finishedAt`) o del modal de My Shelf (`acquiredAt`), el frontend enviaba un timestamp (`2023-07-28T00:00:00.000Z`) en vez de un día, y la API respondía 422 `COMMON_SCHEMA_INVALID` porque esos campos se validan con `z.iso.date()` (`YYYY-MM-DD`). La causa está en Signal Forms: en un `<input type="date">` enlazado con `[formField]`, Angular escribe `valueAsDate` (un `Date`) cuando el valor actual del modelo es `null`, y el texto del input solo cuando es un string. Los campos de fecha ahora arrancan en `""` en vez de `null`, así el modelo siempre guarda el día como string. La API no cambia.

## Fixed

- `BacklogModal`: `startedAt` y `finishedAt` arrancan en `""`, también al cargar una run sin fechas. Editar una run que no tenía fecha de fin y elegir una ya no falla con 422. El toggle de platino, que copia `finishedAt` como fecha por defecto, también recibe el día.
- `GameShelfModal`: `acquiredAt` arranca en `""`, al agregar y al editar.
- Vaciar una fecha sigue enviando `null` al editar y omitiendo el campo al crear, por el `|| null` / `|| undefined` que ya tenía el submit.

## Added

- Test de regresión en `backlog-modal.platinum.spec.ts`: una run sin fechas, con Started y Finished elegidos, envía días planos en el PATCH.
- `game-shelf-modal.spec.ts`, el primer spec del modal de My Shelf: cubre `acquiredAt` en el PATCH y en el POST.

## Files of interest

- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.ts`
- `apps/web/src/app/features/game-shelf/game-shelf-modal/game-shelf-modal.ts`
- `apps/api/src/backlog/schemas/update-backlog.schema.ts`

## Commits

- `e5f7cc47` — fix(web): send picked run and shelf dates as plain days instead of timestamps
- `ce69aae9` — test(web): cover run dates picked on empty fields in the edit run modal
- `9bfbd891` — test(web): cover the acquired date payload in the shelf modal
