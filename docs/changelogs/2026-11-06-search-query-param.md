# Un solo nombre para el param de búsqueda de texto

**Released:** 2026-11-06

## Summary

La búsqueda de texto de la API tenía tres nombres de query param con el mismo comportamiento: `search` en los listados paginados, `q` en `GET /users/search` y `GET /admin/users`, y `query` en `GET /games/search` y `GET /lists/search`. Todos pasan por `common/utils/text-search.util.ts`, así que la diferencia no era de diseño. Queda solo `search`. El único cliente es `apps/web`, por lo que el cambio se hizo sin período de compatibilidad.

## Changed

- `GET /users/search` y `GET /admin/users` reciben `search` en lugar de `q` (`users/schemas/user-search-query.schema.ts`, `users/schemas/admin-users-query.schema.ts`). El error de validación de `/users/search` pasa a "search or email is required".
- `GET /games/search` y `GET /lists/search` reciben `search` en lugar de `query` (`games/schemas/game-search-query.schema.ts`, `common/schemas/search-query.schema.ts`).
- `apps/web` manda `search` desde la búsqueda global, la búsqueda de juegos y de listas, `UsersService.search`, Discover users y Admin → Users.
- Los tests de integración de la API y los specs de la web usan el nombre nuevo, sin cambios de lógica.
- `docs/api/` (Bruno) y `docs/architecture.md` reflejan el nombre único.

## Migration

- Un cliente que mande `q` o `query` a esos cuatro endpoints recibe 422 `COMMON_SCHEMA_INVALID` (los schemas son estrictos) o, en `GET /admin/users`, el listado sin filtrar. Hay que mandar `search`.

## Files of interest

- `apps/api/src/users/schemas/user-search-query.schema.ts`
- `apps/api/src/games/schemas/game-search-query.schema.ts`
- `apps/web/src/app/core/services/global-search.ts`

## Commits

- `eeb1bf92` — refactor(api): rename search query params q and query to search
- `ad2c31b9` — test(api): use search query param in search integration tests
- `9d4daac1` — refactor(web): rename text search query params to search
- `0412796a` — docs(api): rename search query param to search in Bruno collection
- `634c7c1f` — docs(architecture): keep only search as text search param name
