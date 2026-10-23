# Consultas N+1 en la API

**Released:** 2026-10-23

## Summary

Varios endpoints de listado consultaban la base una o más veces por cada elemento: las tarjetas de usuario (de 5 a 9 consultas por usuario), el progreso y los seguidores de las listas (de 2 a 3 por lista) y algunas escrituras que actualizaban fila por fila. Todos pasan a un número constante de consultas, con funciones en lote que agrupan con `GROUP BY`, `IN`, `DISTINCT ON` o `UPDATE ... FROM (VALUES ...)`. El contrato HTTP no cambia: las respuestas, el orden y las reglas de visibilidad son los mismos.

## Highlights

- `GET /users/discover`, `GET /users/search` y `GET /users/:username/followers|following`: hasta 4 consultas por tarjeta en total, sin importar cuántos usuarios haya (antes, 31 con 6 usuarios en discover).
- `GET /users/me/lists`, `GET /users/:username/lists`, `GET /lists/following` y `GET /games/:id/lists`: el progreso y los seguidores de todas las listas en una consulta cada uno.
- Reordenar ítems de una lista, `refresh-scores` y reordenar saved filters: un solo `UPDATE` por request.

## Added

- `users/user-cards.service.ts`: `buildUserCards` en lote. Carga los follows del viewer en las dos direcciones con una consulta, los seguidores por usuario, las estadísticas de backlog y el favorito destacado (`DISTINCT ON`), solo para los usuarios y secciones visibles.
- `isSectionVisible` en `users/helpers/visibility.helper.ts`: la misma regla que `canView`, pero con el dato de seguimiento mutuo ya cargado.
- `getFollowerCounts` y `findFollowEdges` en `user-followers.service`, y `countBacklogByStatusForUsers` en `backlog.service`.
- `getListsProgress` y `getListFollowerCounts` en `lists.service`, junto con el tipo `ListProgress`. Las versiones individuales se mantienen para el detalle de una lista.
- Tests de conteo de consultas con un hook `beforeQuery` (helper `test/helpers/query-counter.helper.ts` y tests propios por bloque), más tests de equivalencia con las funciones individuales.

## Changed

- `users.controller` (discover y search) y `users-profile.service` (followers y following) usan el `buildUserCards` nuevo.
- `lists.controller`, `list-followers.controller`, `games-profile.service` y `users-profile.service` (listas de un perfil) usan las funciones de lote de `lists.service`. `enrichGameList` pasa a ser síncrona y recibe el progreso.
- `list-items.service`: el reorden y `refreshScores` usan un único `UPDATE ... FROM (VALUES ...)` que también actualiza `updatedAt`. `loadOwnedLists` hace un solo `findAll` con `IN` y conserva los errores `LIST_ITEM_LIST_NOT_FOUND` y `LIST_ITEM_FORBIDDEN`.
- `saved-filters.service`: `reorderSavedFilters` actualiza todas las posiciones en una sola sentencia.

## Removed

- `buildUserCard` y `loadFeaturedFavorite` de `users-profile.service`, reemplazadas por `user-cards.service`.

## Files of interest

- `apps/api/src/users/user-cards.service.ts`
- `apps/api/src/lists/lists.service.ts`
- `apps/api/src/list-items/list-items.service.ts`
- `apps/api/test/users/user-cards.integration.test.ts`

## Commits

- `64430082` — perf(list-items): update positions and frozen scores in single bulk queries
- `0cc91b7a` — perf(saved-filters): reorder filters with a single bulk update
- `812b1000` — test(list-items): assert constant query count for bulk position writes
- `688bcb8c` — perf(lists): add batched list progress and follower counts
- `839498c8` — perf(lists): fetch progress of my lists and followed lists in one query
- `4945c603` — perf(games): fetch list progress for a game's lists in one query
- `4ade6504` — perf(users): fetch follower counts and progress of profile lists in batch
- `5c0ca685` — test(lists): cover batched list progress and query counts of list endpoints
- `947683a5` — perf(user-followers): add batched follower counts and viewer follow edges
- `008c37bd` — perf(backlog): add batched backlog status counts for several users
- `67748287` — feat(users): add pure section visibility check from preloaded mutual follows
- `1f1dce89` — perf(users): build discover and search user cards with a constant number of queries
- `5b9a60de` — test(users): cover user card query counts, expected values and legacy equivalence
- `4215cbb8` — perf(users): build follower and following cards with the batched user cards service
