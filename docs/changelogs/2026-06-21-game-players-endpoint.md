# Game players endpoint: random social discovery

**Released:** 2026-06-21

## Summary

Nuevo endpoint que devuelve una muestra aleatoria de usuarios que tienen el juego en su backlog, pensado para alimentar la seccion "Other Players" en la ficha del juego. Complementa el endpoint preexistente `GET /games/:id/friends-activity` (que cubre la senal "amigos que jugaron"): el de players cubre el descubrimiento social abierto. Resuelve FB-022.

La query respeta la visibilidad introducida por la refactor de privacidad: solo entran filas con `Backlog.isPublic = true` y join a `User` filtrado por `profileVisibility IN ('public', 'friends')` + `backlogVisibility IN ('public', 'friends')`. El viewer y la lista de usuarios que ya sigue (`getFollowingIds`) quedan excluidos para no duplicar contra la seccion "Played by Friends".

La randomizacion vive en memoria: una sola query trae los backlogs publicos ordenados por `createdAt DESC`, se dedupea por `userId` (queda la fila mas reciente), se shufflea con Fisher-Yates y se cortan los primeros 10. Sin caching, sin `ORDER BY RANDOM()` — la dedupe en memoria es mas barata para el orden de magnitud actual (cientos de backlogs por juego en el peor caso) y mantiene el contrato simple.

## Highlights

- Endpoint nuevo `GET /games/:id/players` que devuelve hasta 10 usuarios random con su status mas reciente para ese juego.
- Excluye al viewer y a sus `following` para no chocar con `friends-activity`.
- Respeta los enums `profileVisibility` y `backlogVisibility` de la refactor de privacidad de 2026-06-19.
- Sin caching server-side; el orden cambia por request (ese es el efecto deseado del "random").

## Added

- `backlogService.findRandomPlayersForGame(gameId, viewerId, excludeUserIds = [], limit = 10)` — query con dedup por usuario, shuffle Fisher-Yates y slice. Filtra por `Backlog.isPublic = true`, `User.profileVisibility IN ('public', 'friends')` y `User.backlogVisibility IN ('public', 'friends')`. El `excludeUserIds` se mergea con el viewer en un Set antes de aplicar el `Op.notIn`.
- `games.controller.getGamePlayers` — llama al service pasando los `getFollowingIds` del viewer como exclusiones, serializa `{ username, name, avatarUrl, status }`.
- Ruta `GET /games/:id/players` registrada con `authMiddleware()`, `publicLimiter` y `GameIdParamSchema` (mismo stack que `friends-activity`).
- `docs/api/games/players.yml` con la documentacion Bruno del endpoint.

## Files of interest

- `src/backlog/backlog.service.ts` — nueva funcion `findRandomPlayersForGame`.
- `src/games/games.controller.ts` — `getGamePlayers`.
- `src/games/games.routes.ts` — registro de `/games/:id/players`.
- `docs/api/games/players.yml` — doc Bruno.

## Commits

- `62494cd` — feat(games): add GET /games/:id/players with randomized sample
- `a7fd809` — docs(api): document GET /games/:id/players
