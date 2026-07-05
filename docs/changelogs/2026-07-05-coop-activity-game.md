# Juego en las actividades de co-op

**Released:** 2026-07-05

## Summary

Las actividades `coop_tagged` ahora incluyen el juego con el que se jugó en co-op. Antes solo guardaban actor + usuario etiquetado, así que el frontend podía decir "X is playing co-op with Y" pero sin el juego. Se resolvió agregando una columna `metadata` JSONB genérica al modelo `Activity` y guardando un snapshot del juego (`{ game: { id, title, code, backgroundUrl } }`) al momento del tag. El snapshot queda congelado en el instante de la actividad (correcto históricamente) y no requiere joins en lectura. No hubo cambios de serializer para otras actividades: `metadata.game` solo se expone cuando existe.

## Highlights

- Columna `metadata` JSONB reutilizable en `Activity` (no solo para co-op).
- Snapshot del juego adjunto a `coop_tagged` sin migración de esquema adicional en el serializer.
- Serializer expone `game` (`{ type: "game", id, name, code, backgroundUrl }`) junto a `target` cuando la actividad tiene `metadata.game`.
- Backfill de las actividades `coop_tagged` históricas por proximidad temporal.

## Added

- Columna `metadata` (JSONB, nullable) en la tabla `Activities` (migración + atributo en `activity.model.ts`).
- Parámetro opcional `metadata` en `record()` / `persist()` de `activity.service.ts`, persistido en `Activity.create`.
- Resolución de `game` desde `metadata` en `activity.serializer.ts`.
- `gameId` en el retorno de `coopService.addMember`, usado por el controller para construir el snapshot vía `gamesService.findGameById`.

## Changed

- `postMember` (`coop-runs.controller.ts`) resuelve el juego y pasa `{ game: {...} }` como metadata al registrar la actividad `coop_tagged`.
- `docs/api/activity/get-feed.yml` documenta el nuevo campo `game` para `coop_tagged`.

## Migration

- `20260705120000-add-metadata-to-activities`: agrega la columna `metadata` JSONB (aditiva, reversible).
- `20260705130000-backfill-coop-activity-game`: rellena `metadata.game` de las actividades `coop_tagged` históricas. Como la actividad no tiene FK directo al `CoopRun`, se correlaciona por proximidad temporal: el backlog del usuario etiquetado creado en el mismo instante del tag (delta ≤ 5s) determina el `CoopRun` y su juego. En producción resolvió los 14 registros existentes de forma inequívoca (delta sub-segundo, siguiente candidato a ≥ 25s).

## Files of interest

- `src/activity/activity.model.ts` — columna `metadata`.
- `src/activity/activity.service.ts` — `record`/`persist` con metadata.
- `src/activity/activity.serializer.ts` — expone `game` desde metadata.
- `src/coop-runs/coop-runs.service.ts` — `addMember` retorna `gameId`.
- `src/coop-runs/coop-runs.controller.ts` — arma el snapshot del juego.
- `migrations/20260705120000-add-metadata-to-activities.js`
- `migrations/20260705130000-backfill-coop-activity-game.js`
- `docs/api/activity/get-feed.yml`

## Commits

- `42a391b` — feat(activity): add nullable metadata column to activities
- `1382089` — feat(activity): persist and serialize activity metadata
- `f5899c2` — feat(coop): attach played game snapshot to coop_tagged activity
- `1b62760` — chore(db): backfill game metadata for existing coop activities
- `38d5299` — docs(api): document game field on activity feed
