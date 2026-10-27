# Página de platinos

**Released:** 2026-10-26

## Summary

Los platinos tienen su propia página en la biblioteca, `/platinums`, junto a My Shelf y Favorites. Repite la estructura del backlog: una vista dueña con las acciones y la página pública `/user/:username/platinums`, que reutiliza los mismos componentes en solo lectura. Las dos muestran los platinos en tres vistas, Grid, Hardcore y Calendar, con el mismo selector que My Shelf. Desde la página se agrega un platino sin pasar por la ficha del juego: el diálogo de platino ahora busca el juego en el catálogo y carga sus plataformas, las runs del usuario y el platino que ya tenga, de modo que un juego ya platinado se edita en lugar de pisarse. Para la vista propia se agrega `GET /users/me/platinums`, que usa la misma consulta que la lista pública pero sin chequeos de visibilidad.

## Highlights

- Página `/platinums` en Library con búsqueda, filtro por plataforma y botón "Add platinum".
- Vistas Grid, Hardcore y Calendar compartidas entre la página propia y la pública.
- El diálogo de platino busca el juego en el catálogo o lo carga por su código.
- `GET /users/me/platinums`, paginado y con `search` por título.

## Added

- `GET /users/me/platinums` en `game-platinum.controller` (`getMyPlatinums`): reutiliza `findPlatinumsByUserIdPaginated` y `platinumEntrySerializer` con vista de dueño, así que siempre lleva `notes` y `backlogId`. Se registra en `users.routes` antes de `/users/:username/platinums` para que `me` no se tome como username.
- `getMine` en `PlatinumService`.
- Componentes en `features/platinum/components`: `PlatinumCollection` (elige la vista y expone `PLATINUM_VIEW_MODES` y `readStoredPlatinumViewMode`), `PlatinumTable` (Title, Platform, Platinumed on y, para el dueño, Notes y un botón de editar por fila) y `PlatinumCalendar` sobre `MonthCalendar`, por `platinumedAt`, que abre en el mes del último platino y cuenta aparte los platinos sin fecha.
- Página `PlatinumList` en la ruta `/platinums` y entrada "Platinums" en el grupo Library del menú lateral. La vista elegida se guarda en `completr.platinums.viewMode`.
- Slot `[collectionToolbar]` en `ProfileCollectionPage` para sumar controles a la barra de herramientas de las páginas públicas.

## Changed

- `PlatinumDialog` recibe `context` (juego, runs y platino ya cargados, como hace la ficha), `game` (`id` y `code`, y carga `GET /games/:code` y las runs del juego) o nada, y entonces empieza con `GameSearchStep`. Si el juego elegido ya tiene platino, el formulario entra en modo edición. Tiene estados de carga y de error con reintento.
- `PlatinumCoverCard` acepta `selectable`: la portada y el título pasan a ser botones que emiten `selected` en vez de enlazar a la ficha.
- `UserPlatinums` muestra las tres vistas con su propio selector (`completr.publicPlatinums.viewMode`), sin notas ni acciones de edición, y pide 100 platinos por página para que el calendario tenga más meses.
- La ficha del juego abre el diálogo con `context`.

## Files of interest

- `apps/api/src/game-platinum/game-platinum.controller.ts`
- `apps/api/src/users/users.routes.ts`
- `apps/web/src/app/features/platinum/platinum-list/platinum-list.ts`
- `apps/web/src/app/features/platinum/components/platinum-collection/platinum-collection.ts`
- `apps/web/src/app/features/platinum/components/platinum-calendar/platinum-calendar.ts`
- `apps/web/src/app/features/platinum/platinum-dialog/platinum-dialog.ts`
- `apps/web/src/app/features/public-profile/user-platinums/user-platinums.ts`
- `docs/api/game-platinum/get-my-platinums.yml`

## Commits

- `2002cd8e` — feat(game-platinum): list the platinums of the session user
- `a997bafc` — test(api): cover the session user platinums list
- `1eebb833` — docs(api): document the session user platinums endpoint
- `813b724e` — feat(web): fetch the session user platinums
- `cf9accfd` — feat(web): add grid, hardcore and calendar views for platinums
- `3ac84bec` — feat(web): pick or load the game in the platinum dialog
- `0d9cd2f0` — feat(web): add the platinums page to the library
- `d9fdc7fe` — feat(web): show the platinum views in the public platinums page
