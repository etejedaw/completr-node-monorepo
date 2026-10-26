# Platino por juego

**Released:** 2026-10-25

## Summary

Un usuario puede marcar un juego como platinado. El platino se guarda una vez por usuario y juego en el módulo nuevo `game-platinum`, independiente de `GameShelf`, y opcionalmente apunta a la run (`Backlog`) donde se consiguió. No hay endpoint de lectura propio: el platino viaja dentro de las respuestas que ya existen (cada run del backlog y la ficha del juego), con una sola consulta por request. En la web se ve como un trofeo al final del título, con un color propio (`platinum`) distinto del plata del admin; el trofeo de la run donde se consiguió va a color pleno y el de las demás runs del juego, atenuado.

## Highlights

- `PUT` y `DELETE /users/me/games/:gameId/platinum`, con la run, la plataforma, la fecha y las notas opcionales.
- Campo `platinum` en cada run de `GET /users/me/backlog` y `GET /users/:username/backlog`, `userPlatinum` en `GET /games/:code` y filtro `platinumed_only`.
- Marcar, mover o quitar el platino desde el modal "Edit run", el diálogo rápido de cambio de estado y la tarjeta Platinum de la ficha.
- Activity `game_platinumed` en la categoría de juegos del feed.

## Added

- Migración `20261025231119-create-game-platinums.js`: tabla `GamePlatinums` con unique `("userId", "gameId")`. `userId` y `gameId` con `ON DELETE CASCADE`, `backlogId` con `ON DELETE SET NULL` (borrar la run conserva el platino) y `platformId` sin `ON DELETE`. Índices por `gameId` y `backlogId`.
- Módulo `apps/api/src/game-platinum/`: modelo, service, controller, rutas, serializers completo y público, schemas y el sistema de errores en 3 capas.
- `PUT /users/me/games/:gameId/platinum`: reemplaza el platino completo (lo omitido queda en `null`), responde 201 al crear y 200 al actualizar. Si llega `backlogId` sin `platformId`, la plataforma sale de la run. Errores `GAME_PLATINUM_GAME_NOT_FOUND`, `GAME_PLATINUM_BACKLOG_NOT_FOUND` (run inexistente o ajena), `GAME_PLATINUM_BACKLOG_GAME_MISMATCH` y `GAME_PLATINUM_PLATFORM_NOT_FOUND`.
- `DELETE /users/me/games/:gameId/platinum`: 204, o 404 `GAME_PLATINUM_NOT_FOUND`.
- Activity `game_platinumed` en `ACTIVITY_TYPES` y `GAME_TYPES`, registrada solo al crear el platino.
- Filtro `platinumed_only` en `backlog-query.schema` y `build-backlog-where.util`; lo aceptan también los saved filters.
- Web: `PlatinumService`, componente `PlatinumTrophy`, utils `isPlatinumRun` / `isGamePlatinumed`, `PlatinumDialog` y `GamePlatinumCard` en la ficha, sección Platinum en el modal "Edit run", switch "Mark as platinumed" en el diálogo de cambio de estado, filtro "Only platinumed games" en My Games y opción "Platinums" en el filtro del feed.
- Token de color `platinum` en `styles.css` y en los tres temas (cian hielo en Refined Dark, turquesa claro en Midnight Cyan y Twilight Arcade, donde el cian chocaba con `brand` o `playing`).
- Slot `titleSuffix` en `GameTitleCell` para mostrar contenido en la misma línea que el título.

## Changed

- Cada run del backlog propio y del público lleva `platinum`, el mismo objeto para todas las runs del juego. Para otros viewers sigue la visibilidad del backlog, omite `notes` y deja `backlogId` en `null` si la run del platino es privada. Las respuestas que reutilizan el serializer del backlog sin cargar el platino omiten la clave en vez de mandar un `null` falso.
- `GET /games/:code` incluye `game.userPlatinum`.
- `DELETE /games/:id?hard=true` cuenta los platinos como uso del juego y responde 409 `GAME_IN_USE`.
- El trofeo es solo un ícono, sin texto: al final del título en las tarjetas de My Games, la tabla Hardcore, "Your runs", el título de la ficha y la vista previa de la run. La fecha queda en el `title` y el `aria-label` del ícono, y en la fila Platinum de la vista previa.

## Migration

- Correr `npm run migrate:dev` y `npm run migrate:prod` para crear `GamePlatinums`. Sin la tabla, el backlog y la ficha del juego fallan al cargar el platino.

## Files of interest

- `apps/api/migrations/20261025231119-create-game-platinums.js`
- `apps/api/src/game-platinum/game-platinum.service.ts`
- `apps/api/src/backlog/backlog.controller.ts`
- `apps/api/src/backlog/utils/build-backlog-where.util.ts`
- `apps/web/src/app/shared/components/platinum-trophy/platinum-trophy.ts`
- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.ts`
- `apps/web/src/app/features/games/game-detail/components/game-platinum-card.ts`
- `docs/api/game-platinum/put-platinum.yml`

## Commits

- `29489990` — feat(game-platinum): add game platinums table, model and associations
- `7c4f3100` — feat(game-platinum): add put and delete platinum endpoints
- `bbab0917` — feat(activity): add game_platinumed activity to the games category
- `95149e39` — feat(backlog): expose the platinum in runs and filter by platinumed games
- `bd28d29e` — feat(games): expose the user platinum in game detail and count it as game in use
- `49a791b4` — test(game-platinum): cover endpoints, foreign keys, backlog visibility, filter and serializers
- `9ad0fc57` — docs(api): document game platinum endpoints, platinum fields and platinumed_only filter
- `9c2801bd` — docs(invariants): add game platinum rules
- `d2793b47` — feat(web): add platinum models, service and trophy component
- `b209aea2` — feat(web): mark runs as platinumed and filter platinumed games in my games
- `aa8849b4` — feat(web): mark, edit and remove the platinum from the game detail
- `3dcabfa1` — feat(web): show platinum activities and filter them in the feed
- `c59f8760` — test(web): cover platinum service, trophies, status dialog, game detail and platinumed filter
- `e98cf538` — feat(web): mark, move and remove the run platinum from the edit run modal
- `eb455fd6` — test(web): cover the run platinum in the edit run modal
- `46db219f` — feat(web): show the platinum as a trophy icon after the game title
- `a31ba086` — feat(web): show the platinum trophy and date in the run preview
- `533b8813` — test(web): cover icon only trophies and the platinum in the run preview
- `0023c699` — feat(web): add platinum color token to every theme
- `de760eba` — fix(web): paint the platinum trophy with its own color instead of the admin silver
- `6444925e` — docs(web): document the platinum color token
- `73a33c67` — fix(web): show the platinum trophy next to the title in the hardcore table
- `c7c440e6` — test(web): cover the platinum trophy position in the hardcore table
