# Status endless para el backlog

**Released:** 2026-06-17

## Summary

Resuelve FB-023 incorporando un nuevo status `endless` al enum del backlog para juegos sin un estado natural de "completado" (Timberman, Tetris, Vampire Survivors, roguelikes sin ending, juegos competitivos). El status habilita rating y review pero no expone `finishedAt` ni `realDuration` — semánticamente esos campos no aplican a un run que no termina. Se trata como playthrough finalizado para el Queue (al transicionar saca al juego de la cola) y para el progreso de listas oficiales (cuenta junto a `completed` y `abandoned`). Las métricas de "completados del mes" en highlights siguen filtrando solo `completed`, así que `endless` no contamina los rankings.

## Highlights

- Nuevo status `endless` en `BACKLOG_STATUSES`, migration aditiva sobre el enum de Postgres.
- Nueva activity type `backlog_endless` para el feed.
- Queue / list progress lo tratan como playthrough finalizado; highlights mensuales no lo cuentan como `completed`.
- Documentación Bruno y de feedback actualizada.

## Added

- **`endless` en `BACKLOG_STATUSES`** y en el tipo `BacklogStatus`.
- **Migration** `20260617050000-add-endless-to-backlog-status.js` — `ALTER TYPE "enum_Backlogs_status" ADD VALUE IF NOT EXISTS 'endless'`. Aditiva, no bloqueante, sin downtime. El `down()` queda vacío porque Postgres no permite remover valores de un enum sin recrear el tipo.
- **Activity type `backlog_endless`** en `ACTIVITY_TYPES` y en el `GAME_TYPES` whitelist del `activity.service`.

## Changed

- **`updateBacklog`** ahora elimina el juego de la queue cuando la transición es a `endless` (junto a `playing`, `completed` y `abandoned`).
- **`countBacklogByStatus`** expone el contador `endless` en el resultado.
- **`lists.service.getListProgress`** incluye `endless` entre los statuses que cuentan como progreso ("experimentado").

## Migration

- Correr `npm run migrate` antes de levantar la nueva versión del backend en cada entorno. Sin la migración, cualquier intento de escribir `status = 'endless'` falla con `invalid input value for enum`.

## Files of interest

- `migrations/20260617050000-add-endless-to-backlog-status.js`
- `src/backlog/backlog.model.ts`, `src/backlog/backlog.service.ts`
- `src/activity/activity.model.ts`, `src/activity/activity.service.ts`
- `src/lists/lists.service.ts`
- `docs/api/backlog/get-my-playthroughs.yml`, `docs/api/backlog/get-user-playthroughs.yml`, `docs/api/backlog/create.yml`, `docs/api/backlog/update.yml`, `docs/api/games/friends-activity.yml`

## Commits

- `7456adc` — feat(backlog): add endless status to enum and model
- `637b93f` — feat(backlog): treat endless like a finalised playthrough for queue, lists and activity
- `3a7826a` — docs(api): list endless among valid backlog statuses
- `91a43b5` — docs(feedback): mark FB-023 (endless status) as resuelto
