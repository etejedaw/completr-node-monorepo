# Fuentes de score como catálogo

**Released:** 2026-10-11

## Summary

Las fuentes de score (Metacritic, OpenCritic, RAWG, Completr y cualquier otra) pasan a ser solo registros de `ScoreSources`. Antes estaban fijas en el código en varios lugares: constantes `SCORE_SOURCES` / `SCORE_SOURCES_API`, `z.enum` en los schemas, el enum de Postgres `enum_Lists_scoreSource`, prioridades escritas a mano en una subquery y en el frontend. El catálogo de la base solo se usaba para leer la escala. Una fuente creada con `POST /score-sources` aparecía en el listado pero no se podía usar, y una base sin catálogo aceptaba notas de fuentes inexistentes: el frontend no encontraba la escala y precargaba 87 sobre 5 en el modal del backlog. Ahora la base y la API validan contra el catálogo, la prioridad entre fuentes es un dato y la extracción de notas y duraciones desde RAWG pasa por un registry de extractores tipados.

## Highlights

- Cualquier fuente del catálogo sirve para notas de juegos y como `scoreSource` de listas, sin tocar código.
- FK `GameScores.source` y `Lists.scoreSource` → `ScoreSources.code` con `ON DELETE RESTRICT`: no se puede borrar una fuente en uso.
- Columna `priority` que decide qué fuente manda (orden de `/games` y precarga del modal del backlog).
- Registry de extractores para RAWG: un campo nuevo es una línea en un array tipado, sin `if` en el mapper.

## Added

- Columna `ScoreSources.priority` (entero, menor gana, default 100). `GET /score-sources` la expone y ordena por ella. `POST /score-sources` la acepta como opcional.
- Error `SCORE_SOURCE_ALREADY_EXISTS` (409) al crear una fuente con un `code` repetido. Antes respondía 500.
- Errores de fuente inexistente (422): `GAME_SCORE_SOURCE_NOT_FOUND` en `game-scores` y `games`, y `LIST_SCORE_SOURCE_NOT_FOUND` en `lists`.
- `games/mappers/extractors/`: `SourceValueExtractor<TPayload, TSource>`, el runner `extractSourceValues` y los arrays `RAWG_SCORE_EXTRACTORS` y `RAWG_TIME_EXTRACTORS`.
- Frontend: `ScoreSourcesService.whenLoaded()` (catálogo cacheado con `shareReplay`) y `manualSources()`.

## Changed

- Los schemas validan el `source` solo como texto (`ScoreSourceCodeSchema`) y el service comprueba que exista en el catálogo. `ManualScoreSourceCodeSchema` rechaza `completr`, que solo escribe el job `calculate-ratings` (`COMPLETR_SCORE_SOURCE`).
- `POST /games` valida las fuentes de `scores` antes de abrir la transacción.
- Al importar desde RAWG (y en la vista previa `rawg-detail`), las notas de fuentes que no están en el catálogo se omiten con un warning en el log; el juego se importa igual.
- Frontend: las opciones de fuente de `list-modal`, `admin-games` y `admin-game-editor` y la prioridad de precarga del modal del backlog salen del catálogo.

## Fixed

- El orden por score y por ratio en `/games` comparaba notas crudas en escalas distintas (Metacritic 87 quedaba sobre Completr 4.5). La subquery canónica normaliza con `score * 5 / scale` y elige la fuente por `priority`.
- El modal del backlog esperaba al catálogo antes de precargar el Critic Score; si el catálogo no había llegado, precargaba la nota sin normalizar.

## Migration

`20261011230710-change-score-sources-to-catalog`, idempotente:

1. Agrega `priority` y siembra completr (5), metacritic (100), opencritic (100) y rawg (5) con `ON CONFLICT (code) DO NOTHING`. A las fuentes existentes con prioridad por defecto les asigna el orden que antes estaba fijo en el código (completr 1, metacritic 2, opencritic 3, rawg 4).
2. Convierte `Lists.scoreSource` de enum a `VARCHAR(50)` y elimina `enum_Lists_scoreSource`.
3. Aborta con un mensaje si alguna fuente usada por `GameScores` o `Lists` no está en el catálogo.
4. Recrea `GameScores_source_fkey` (en algunos entornos existía con `ON DELETE CASCADE`) y crea `Lists_scoreSource_fkey`, ambas con `ON UPDATE CASCADE ON DELETE RESTRICT`.

Las fuentes de duración (`GameTimes.source`, `Lists.durationSource`) siguen como enum fijo; solo su extracción desde RAWG pasa al registry.

## Files of interest

- `apps/api/migrations/20261011230710-change-score-sources-to-catalog.js`
- `apps/api/src/score-sources/` — modelo, schemas, service y errores del catálogo.
- `apps/api/src/games/mappers/extractors/` — registry de extractores.
- `apps/api/src/games/utils/search-filters.util.ts` — orden canónico normalizado.
- `apps/web/src/app/core/services/score-sources.ts`
- `docs/invariants.md` — sección "Catálogo de fuentes de score".

## Commits

- `9d6fe7d6` — feat(db): turn score sources into a catalog with priority and foreign keys
- `2aac9a8c` — refactor(games): extract rawg scores and times through an extractor registry
- `aa19635d` — feat(api): validate score sources against the catalog
- `793041e1` — fix(games): sort by score normalized to each source scale
- `e15c9fd6` — feat(web): read score sources and their priority from the catalog
- `5b1f41b7` — docs(api): document the score source catalog and extractor registry
