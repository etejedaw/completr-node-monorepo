# Escrituras atómicas

**Released:** 2026-10-21

## Summary

Varias pantallas lanzaban escrituras en paralelo (`forkJoin` o `Promise.all`) y, si una fallaba, el estado quedaba a medias sin que el usuario se enterara. Se reemplazan por endpoints que hacen todo en una sola transacción: crear una partida con sus extras, fijar en qué listas está un juego, vincular los juegos de una saga y reemplazar los scores y duraciones de un juego. Las lecturas independientes se dejan en paralelo. El cambio se valida con tests de caracterización que corren sin modificar sobre el código anterior y el nuevo: los caminos felices pasan en ambos y los casos de fallo documentan el cambio intencional.

## Highlights

- `POST /users/me/backlog` crea la partida y, opcionalmente, su entrada en Up Next, la estantería, mood tags, review y nota de progreso en una transacción.
- `PUT /games/:gameId/lists` fija el conjunto de listas propias que contienen un juego.
- `POST` y `PATCH /franchises` aceptan `gameIds`; `PUT /games/:gameId/scores` y `PUT /games/:gameId/times` reemplazan el conjunto completo.
- Tests de caracterización (`*.characterization.spec.ts`) para los cinco flujos afectados.

## Added

- Campos opcionales `addToQueue`, `addToShelf`, `moodTags`, `review` y `progressNote` en `POST /users/me/backlog`. `addToShelf` se omite si el juego ya está en la estantería en la misma plataforma; `review` se omite si ya existe.
- Parámetro opcional `transaction` en los services de `queue`, `game-shelf`, `mood-tags`, `reviews` y `backlog-progress`, y `existsGameShelfEntry` en `game-shelf`.
- `PUT /games/:gameId/lists` en el módulo `list-items`, con la misma respuesta que `GET /games/:id/lists`.
- `gameIds` en `POST` y `PATCH /franchises`, y el error `FRANCHISE_GAMES_NOT_FOUND` (404).
- `PUT /games/:gameId/scores` y `PUT /games/:gameId/times` en `game-scores` y `game-times`.
- Tests de integración con rollback a mitad de camino para cada endpoint nuevo.
- Tests de caracterización de añadir a listas, seguidores y seguidos, sagas en admin, scores y duraciones en admin, y creación de partidas.

## Changed

- `backlog-modal` crea la partida con una sola petición y muestra el error sin cerrarse si algo falla.
- `game-add-to-list-modal` guarda con una sola petición, sin `Promise.all`.
- `user-connections` pide solo la lista de la pestaña activa y toma los dos contadores del perfil.
- `admin-franchise-modal` guarda la saga y sus juegos con una sola petición; `admin-game-editor` guarda scores y duraciones con como máximo dos.
- `createBacklog` en `backlog.service.ts` recibe el `RequestUser` y devuelve también qué extras se crearon.
- `docs/invariants.md` y la colección Bruno documentan los endpoints nuevos.

## Fixed

- Crear una partida con Up Next lleno ya no deja la partida creada sin su entrada en Up Next ni pierde el error.
- Crear varias partidas del mismo juego y plataforma con "Add to My Shelf" ya no duplica el juego en la estantería.
- `admin-game-editor` muestra "Game saved." también al guardar sin cambios en scores ni duraciones.

## Files of interest

- `apps/api/src/backlog/backlog.service.ts`, `apps/api/src/backlog/schemas/register-backlog.schema.ts`
- `apps/api/src/list-items/list-items.service.ts`
- `apps/api/src/franchises/franchises.service.ts`
- `apps/api/src/game-scores/game-scores.service.ts`, `apps/api/src/game-times/game-times.service.ts`
- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.ts`
- `apps/web/src/app/**/*.characterization.spec.ts`

## Commits

- `4781ec0a` — feat(api): accept an optional transaction in queue, shelf, mood tags, reviews and progress services
- `84fbebaa` — feat(backlog): create the entry and its queue, shelf, mood tags, review and progress note in one transaction
- `e2d5fac1` — test(backlog): cover atomic backlog creation with extras and rollback on failure
- `aab922c7` — docs(api): document backlog creation extras and their errors
- `b7448797` — feat(web): create a backlog entry and its extras in a single request
- `08d63351` — test(web): cover single-request backlog creation in the modal
- `cc580e22` — feat(list-items): add PUT /games/:gameId/lists to set game membership atomically
- `5c17df51` — test(list-items): cover atomic game lists membership including rollback
- `d08e179c` — docs(api): document set game lists endpoint
- `52cacf22` — feat(web): add setGameLists to the lists service
- `e6154562` — fix(web): save add to list modal with a single request
- `073fd65a` — fix(web): load only the requested connections list and show both totals from the profile
- `db2a8fc7` — feat(franchises): accept gameIds to set a franchise's games atomically
- `1cc239c4` — test(franchises): cover atomic game linking and rollback
- `47bb30eb` — docs(api): document gameIds in create and update franchise
- `7a320074` — feat(web): save franchise and games in a single request from the admin modal
- `c24ef356` — test(web): cover single-request saving in the admin franchise modal
- `b8f28dd7` — feat(game-scores): add bulk replace endpoint for game scores
- `2e595e14` — feat(game-times): add bulk replace endpoint for game times
- `6b054e2c` — test(game-scores): cover bulk replace of scores and times with rollback
- `90be5fd3` — docs(api): document bulk replace of game scores and times
- `47441b0b` — feat(web): add replaceScores and replaceTimes to games service
- `fce2398b` — fix(web): save admin game scores and times with at most two requests
- `ebccdb3a` — docs(invariants): document atomic backlog creation, game lists, franchise games and bulk scores
- `880b9760` — test(lists): add characterization tests for adding a game to lists from the game page
- `fd60bd2e` — test(users): add characterization tests for the followers and following screens
- `7821ced5` — test(franchises): add characterization tests for saving franchise games in the admin modal
- `58f9f23f` — test(games): add characterization tests for saving scores and durations in the admin game editor
- `e3095e96` — test(backlog): add characterization tests for creating a run with extras in the My Games modal
- `af7ac578` — fix(web): show the saved toast when the admin game editor saves without score or time changes
- `8051f64c` — test(games): expect atomic score saving and count saved toasts in the admin editor characterization
- `9fe4421d` — test(web): expect the atomic behavior on failure in the characterization tests
