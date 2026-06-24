# Slimming de respuestas de listado y previews

**Released:** 2026-06-24

## Summary

Pasada de optimización sobre los endpoints con payloads más gordos detectados al analizar la lentitud percibida en `web.completr.app`. El backend responde rápido (50-150ms de procesamiento real), pero estaba sirviendo decenas de KB de campos que el frontend ni siquiera tipa. Tres frentes: (1) endurecer la regla de "attributes whitelist en includes" en módulos no cubiertos por el audit del 23-jun, (2) achicar el preview de backlog en el perfil público, (3) cambiar `/games?limit=50` a un shape lightweight pensado para grid cards. El tiempo de servidor no cambia; lo que cae es el tamaño del JSON sobre la red — el bottleneck real cuando el cliente vive en Sudamérica y cada XHR paga 145ms de RTT.

## Highlights

- `/games?limit=50` baja de 140KB a 20.6KB (-85%) sin perder ningún campo que el browse muestre en pantalla.
- `/users/:username` (perfil público) baja de 70KB a 7.5KB (-89%); el backlog preview pasa de 100 a 6 entries, alineado con lo que la UI realmente renderiza antes del "Ver más".
- `/users/me/game-shelf?limit=50` baja de 63KB a ~30KB (-53%) al dejar de incluir el `User` completo, la `description` del juego y los `Genres` anidados que la tabla no muestra.
- Centralización de `USER_PUBLIC_ATTRS` en `src/users/constants/user-attrs.constants.ts` para dedupe del whitelist `id/username/name/avatarUrl` que estaba inline en 9 services.

## Added

- `src/users/constants/user-attrs.constants.ts` — constante `USER_PUBLIC_ATTRS` reutilizada en includes de `activity`, `backlog`, `list-followers`, `reviews`, `user-followers`, `user-follow-requests` y `users.service` (search/findByExactEmail).
- `gameListSerializer` en `src/games/games.serializer.ts` — variante lightweight para el browse: solo `id, code, title, backgroundUrl, isDlc, ratio, genres, justImported`.
- Constante `PROFILE_BACKLOG_PREVIEW = 6` en `src/users/users-profile.service.ts`.

## Changed

- `users-profile.service.loadBacklog` — pasa `{ limit: 6 }` a `findBacklogByUserId`/`findPublicBacklogByUserId`. El listado paginado completo sigue en `GET /users/:username/backlog`.
- `game-shelf.service` — los tres finders (`findGameShelfByUserId`, `findGameShelfByUserIdPaginated`, `findPublicGameShelfByUserId`) ya no incluyen `User` (frontend no lo leía), ni `Genre` anidado en `Game`, y aplican whitelist `["id", "code", "title", "backgroundUrl", "isDlc"]` sobre `Game`. `Platform` queda con whitelist explícito también.
- `game-shelf.serializer` y `game-shelf-me.serializer` — quitan el campo `user` y los campos `description`/`releaseAt`/`genres` del bloque `game`. La respuesta sigue válida contra `GameShelfEntry` del frontend (no usa esos campos).
- `games-search.findAll` y `findLatestReviewed` — restringen attrs de `Game` a `GAME_LIST_ATTRS` (incluye `createdAt` y `releaseAt` para que el `ORDER BY` siga funcionando con la subquery de Sequelize) y dropean los includes de `Platforms`, `GameExternals`, `Dlcs`, `ParentGame`, `CompilationItems`, `PartOfCompilations`. Mantienen `Genres`, `GameScores`, `GameTimes` con su whitelist (los dos últimos siguen siendo necesarios para calcular `ratio`).
- `games.controller.getAllGames` y `getLatestReviewedGames` — usan `gameListSerializer` en lugar de `gameSerializer`. Las demás superficies (`/games/:code`, `/games/search`, admin editor) siguen retornando el shape completo.
- Bruno: `docs/api/users/get-by-username.yml`, `docs/api/game-shelf/get-my-shelf.yml`, `docs/api/game-shelf/get-user-shelf.yml`, `docs/api/games/get-all.yml` actualizados para reflejar el nuevo shape y dejar explícito el cap de 6 en el preview de backlog.
- 9 includes inline `attributes: ["id", "username", "name", "avatarUrl"]` reemplazados por `USER_PUBLIC_ATTRS`.

## Files of interest

- `src/users/users-profile.service.ts` — preview cap del perfil.
- `src/game-shelf/game-shelf.service.ts` + `src/game-shelf/serializers/*.ts` — shelf slim.
- `src/games/services/games-search.service.ts` + `src/games/games.serializer.ts` + `src/games/games.controller.ts` — games browse light shape.
- `src/users/constants/user-attrs.constants.ts` + 7 services aplicando la constante.
- `docs/api/users/get-by-username.yml`, `docs/api/games/get-all.yml`, `docs/api/game-shelf/*.yml` — Bruno actualizado.

## Commits

- `a3ceb74` — perf(includes): trim user game and platform attrs in sequelize includes
- `265fe93` — perf(profile): cap public profile backlog preview at 6
- `31851a3` — perf(game-shelf): drop unused user, description and nested genres from list responses
- `8ce9f08` — perf(games): return lightweight shape for browse list endpoints
