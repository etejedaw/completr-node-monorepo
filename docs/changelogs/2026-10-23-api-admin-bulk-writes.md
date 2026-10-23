# Escrituras en lote del catálogo y de listas

**Released:** 2026-10-23

## Summary

Cierra los N+1 que quedaban en las escrituras de la API. Registrar un juego, dividirlo en variantes, crear partes de una compilación, guardar ids externos y agregar o quitar un juego de varias listas hacían consultas por cada score, tiempo, variante, plataforma, género, id externo o lista. Ahora usan inserciones y actualizaciones en lote con un número constante de consultas, con las mismas validaciones, errores y resultados.

## Highlights

- `POST /games`, `PATCH /games/:id`, `POST /games/:id/split` y `PUT /games/:id/compilation-items` hacen el mismo número de consultas sin importar cuántos scores, tiempos, variantes o ids externos lleven.
- `PUT /games/:id/lists` agrega y quita en todas las listas con una consulta por operación.

## Added

- `game-scores.service.createGameScores` (valida la escala de todas las fuentes con una consulta y hace `bulkCreate`) y `game-times.service.createGameTimes`, más `findScoresByGameIdAndSources` y `findTimesByGameIdAndSources`.
- `score-sources.service.findByCodes`.
- `linkGamesToPlatforms` y `linkGamesToGenres`, para varios juegos a la vez.
- `game-external.service.upsertMany`.
- `list-items.service`: `loadFrozenScoreContextsForGame`, `findMaxPositionsByListId` y `compactPositionsInLists` (un `UPDATE ... FROM` con `ROW_NUMBER() OVER (PARTITION BY "listId")`).

## Changed

- `games.service`: `createScores` y `createTimes` usan las funciones de lote, y `upsertExternalIds` usa `upsertMany`.
- `games-variant.service`: `createVariantsFromOriginal` crea todas las variantes con un `bulkCreate` y vincula scores, tiempos, plataformas, géneros e ids externos en lote. Además refresca las variantes con un solo `findAll`, en el orden de creación, y `assertVariantConsistency` resuelve los hermanos con dos consultas.
- `games-compilation.service`: las partes nuevas heredan scores y tiempos en lote.
- `list-items.service.setGameLists`: altas con un `bulkCreate` y bajas con un `destroy` con `IN` más una compactación de posiciones en lote. `compactPositions` y `loadFrozenScoreContext` se mantienen para las operaciones de una sola lista.
- Todos los `bulkCreate` del catálogo llevan `validate: true` para conservar las validaciones del modelo.

## Fixed

- El test "refreshes updatedAt of the moved items" dependía de milisegundos y fallaba a veces; ahora compara contra un `updatedAt` fijado en el pasado.

## Files of interest

- `apps/api/src/games/services/games-variant.service.ts`
- `apps/api/src/list-items/list-items.service.ts`
- `apps/api/src/game-scores/game-scores.service.ts`
- `apps/api/test/admin/admin-bulk-writes.integration.test.ts`

## Commits

- `3ea7ac78` — perf(game-scores): add batch creation for scores and times
- `fa6c8371` — perf(games): add batch platform and genre links and external id upsert
- `92e7d5ce` — perf(games): bulk write scores, times, variants and compilation parts
- `dbc0f5c3` — perf(list-items): batch additions and removals when setting game lists
- `e7181f65` — test(list-items): make updatedAt check deterministic and fail removal in rollback test
- `4ea3d509` — test(games): cover query counts of bulk game and list writes
