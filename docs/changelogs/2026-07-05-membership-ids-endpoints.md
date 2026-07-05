# Membership IDs Endpoints

**Released:** 2026-07-05

## Summary

Las vistas del frontend (My Shelf, Favoritos, My Games) necesitaban saber si un juego pertenece al backlog, la wishlist, los favoritos o la cola del usuario, y lo resolvían descargando las colecciones completas paginadas a 100 para armar sets de IDs en el cliente. Con más de 100 entradas de backlog los indicadores mostraban datos incorrectos. Se resolvió en dos frentes: endpoints ligeros de solo-IDs sin paginar para los sets compartidos (favoritos, wishlist, cola), y un flag `inBacklog` calculado en el servidor por entry para el shelf y los favoritos, siguiendo el patrón batcheado de `getBacklogSummaryMap` en `lists` (segunda query acotada a los gameIds de la página, mezclada en el serializer).

## Highlights

- `inBacklog` correcto a cualquier escala: la pertenencia se calcula contra toda la tabla de backlog del usuario, no contra la primera página.
- Los sets de membership pasan de payloads de listas completas a arrays planos de UUIDs.
- `GET /users/me/queue/backlog-ids` devuelve los IDs ordenados por posición, apto para reconstruir la cola en flujos de remove.

## Added

- `GET /users/me/favorites/game-ids` — gameIds de favoritos sin paginar.
- `GET /users/me/wishlist/game-ids` — gameIds de la wishlist sin paginar.
- `GET /users/me/queue/backlog-ids` — backlogIds de la cola ordenados por posición.
- `findGameIdsInBacklogByUser(userId, gameIds)` en `backlog.service` — lookup batcheado de pertenencia con `group by gameId`.
- Documentación Bruno de los tres endpoints nuevos.

## Changed

- `GET /users/me/game-shelf` incluye `inBacklog` por entry (`gameShelfMeSerializer`).
- `GET /users/me/favorites` incluye `inBacklog` por entry (`favoriteSerializer`).
- Ambos controllers calculan la pertenencia en paralelo con los mood tags vía `Promise.all`.

## Files of interest

- `src/backlog/backlog.service.ts` — lookup de membership.
- `src/game-shelf/game-shelf.controller.ts` y `src/game-shelf/serializers/game-shelf-me.serializer.ts` — flag en el shelf.
- `src/favorites/favorites.controller.ts`, `src/favorites/favorites.routes.ts`, `src/favorites/favorites.serializer.ts` — flag + endpoint de IDs.
- `src/wishlist/wishlist.routes.ts`, `src/queue/queue.service.ts` — endpoints de IDs.
- `docs/api/favorites/get-my-game-ids.yml`, `docs/api/wishlist/get-my-game-ids.yml`, `docs/api/queue/get-my-backlog-ids.yml`.

## Commits

- `57af322` — feat(backlog): add game ids membership lookup by user
- `38e01ca` — feat(game-shelf): include inBacklog flag in my shelf response
- `c8cce23` — feat(favorites): add game-ids endpoint and inBacklog flag
- `5e830be` — feat(wishlist): add game-ids endpoint
- `a12197b` — feat(queue): add backlog-ids endpoint
