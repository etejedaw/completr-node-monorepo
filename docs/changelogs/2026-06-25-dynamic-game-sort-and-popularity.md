# Dynamic game sort and popularity

**Released:** 2026-06-25

## Summary

`GET /games` ahora acepta criterios de ordenamiento derivados (`score`, `duration`, `ratio`, `popularity`) además de los campos directos del modelo. Score y duration se resuelven por prioridad de fuente (`completr → metacritic → opencritic → rawg` para score; `completr → hltb → rawg` para duration) vía subqueries SQL con `NULLS LAST`. La popularidad por juego vive en una tabla derivada `GamePopularities`, recalculada por un nuevo job admin que cuenta usuarios distintos con el juego en su GameShelf. La decisión clave fue materializar popularity (en lugar de calcular on-the-fly) porque ese sort es el que más se va a usar y el COUNT(DISTINCT) por query no escala con el catálogo.

## Highlights

- 4 nuevos sort criteria sobre `GET /games`: `score`, `duration`, `ratio`, `popularity`.
- Tabla `GamePopularities` con backfill en la migración + recompute idempotente.
- Job admin `POST /admin/jobs/recompute-popularity` registrado en el mismo patrón que el resto (`populate-rawg`, `calculate-ratings`).

## Added

- Migración `20260625130000-create-game-popularity.js` con backfill via INSERT...SELECT.
- Módulo `src/game-popularity/` con modelo y servicio `recomputeAllPopularity()` que hace UPSERT bulk.
- Endpoint `POST /admin/jobs/recompute-popularity` + job `recompute_popularity` siguiendo el patrón de `jobsService.startJob`.
- Subqueries reutilizables en `src/games/utils/search-filters.util.ts` para score/duration canónicos y popularity.

## Changed

- `GamesQuerySchema.sort_by` ahora acepta `score`, `duration`, `ratio` y `popularity`.
- `buildOrder` aplica `NULLS LAST` para los sort derivados sin importar la dirección.
- Asociación `Game.hasOne(GamePopularity)` registrada.

## Files of interest

- `migrations/20260625130000-create-game-popularity.js`
- `src/game-popularity/game-popularity.model.ts`
- `src/game-popularity/game-popularity.service.ts`
- `src/games/utils/search-filters.util.ts`
- `src/games/schemas/games-query.schema.ts`
- `src/jobs/jobs.service.ts`
- `src/jobs/jobs.controller.ts`
- `src/jobs/jobs.routes.ts`
- `docs/api/games/get-all.yml`
- `docs/api/jobs/recompute-popularity.yml`

## Commits

- `c3c67e4` — feat(game-popularity): add GamePopularity model and recompute service
- `f1fd6a1` — feat(jobs): add recompute-popularity admin job
- `c8e4067` — feat(games): support dynamic sort by score, duration, ratio, popularity
- `6bf713f` — docs(api): document games sort criteria and recompute-popularity job
