# Comparación de librerías entre usuarios

**Released:** 2026-07-06

## Summary

Se reemplazó el endpoint `GET /users/:username/games-in-common` (solo intersección de completados) por un endpoint configurable de comparación de librerías: `GET /users/:username/comparison`. Ahora se compara cualquier dimensión de la librería vía el query param `by` (`completed`, `playing`, `not_started`, `shelf`, `favorites`, `wishlist`), cada una mapeada a su fuente de datos y a su sección de privacidad (`backlog`, `shelf`, `favorite`, `wishlist`). La respuesta trae tres buckets calculados como operaciones de conjuntos sobre la misma dimensión: `inCommon`, `onlyViewer` y `onlyTarget`, con `counts` de totales reales y paginación (`limit`/`offset`).

Por defecto solo se computa y devuelve `inCommon` (los diffs son opt-in vía `includeOnlyTarget` / `includeOnlyViewer`). Esto permite optimizar: cuando no se piden los diffs, la consulta al target se restringe a los juegos del viewer en vez de traer toda su librería. El frontend consume el endpoint en la sección de comparación del perfil y en la subpágina paginada `in-common`.

## Highlights

- Un endpoint parametrizado por dimensión reemplaza al fijo de "completados en común".
- Buckets `inCommon` / `onlyViewer` / `onlyTarget` con `counts` reales y paginación.
- Privacidad por dimensión: el set del target se filtra por su sección de visibilidad y por `isPublic` donde aplica.
- Diffs opt-in para no cargar la librería completa del target salvo que se pidan.

## Added

- `GET /users/:username/comparison?by=<dim>&includeOnlyTarget=&includeOnlyViewer=&limit=&offset=`.
- `ComparisonQuerySchema` con enum de dimensiones y flags `stringbool`.
- Métodos `findGameEntries*` en `backlog`, `game-shelf`, `favorites` y `wishlist` (con filtro opcional por `gameIds` para restringir la consulta del target).

## Removed

- `GET /users/:username/games-in-common` y `backlogService.findCommonCompletedGames`.

## Files of interest

- `src/users/users-profile.service.ts` — `getComparisonForUsername`, lógica de buckets y paginación.
- `src/users/schemas/comparison-query.schema.ts` — dimensiones y flags.
- `src/backlog/backlog.service.ts`, `src/game-shelf/game-shelf.service.ts`, `src/favorites/favorites.service.ts`, `src/wishlist/wishlist.service.ts` — fuentes por dimensión.
- `docs/api/users/comparison.yml` — documentación Bruno.

## Commits

- `2b42c0a` — feat(users): replace games-in-common with configurable library comparison endpoint
- `92f1a24` — docs(api): document user comparison endpoint, remove games-in-common
