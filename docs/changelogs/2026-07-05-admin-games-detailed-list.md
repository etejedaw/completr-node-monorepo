# Shape detallado en el listado de games para la vista admin

**Released:** 2026-07-05

## Summary

El listado de games (`GET /games`) acepta un nuevo query param `detailed` (stringbool). Cuando es `true`, cada game se serializa con `gameAdminListSerializer`, que expone los datos que la tabla de administración necesita: plataformas, scores y times completos por fuente, `isActive`, `variant` y ratio calculado. El shape liviano de siempre se mantiene como default para el resto de los consumidores. Es la contraparte backend de la tabla de admin-games del frontend, que dejó de hacer un request por fila para leer plataformas.

## Highlights

- Query param `detailed` en `GamesQuerySchema`, opt-in y sin cambios para clientes existentes.
- `gameAdminListSerializer` nuevo: plataformas, scores, times, `isActive`, `variant` y ratio en una sola respuesta.
- El service incluye las asociaciones solo cuando `detailed=true` — el listado público no paga el costo de los includes.

## Added

- `detailed` (stringbool) en `GamesQuerySchema`.
- `gameAdminListSerializer` en `games.serializer.ts`.

## Changed

- `games-search.service.ts` condiciona los includes de `Platform`, `GameScore` y `GameTime` al flag.
- `games.controller.ts` elige serializer según `detailed`.

## Files of interest

- `src/games/games.serializer.ts`
- `src/games/services/games-search.service.ts`
- `src/games/schemas/games-query.schema.ts`
- `docs/api/games/get-all.yml`

## Commits

- `54af93e` — fix(games): add detailed shape to list endpoint for admin view
