# Acciones masivas en las vistas Hardcore

**Released:** 2026-11-03

## Summary

Las tablas Hardcore propias (My Games, My Shelf y Platinums) permiten seleccionar varias filas y aplicarles una acción a todas a la vez. En la API, cada recurso suma un único endpoint `POST .../bulk` y la operación se elige con el query param `action`. Cada lote corre en una transacción, admite hasta 100 ids y responde con los ids aplicados (`succeeded`) y los omitidos (`skipped`, con su código). Un id ajeno o inexistente no hace fallar el lote. El frontend comparte la selección, la barra de acciones y el borrado con Undo entre las tres tablas, y cada tabla declara sus acciones según lo que ya permite hacer por fila.

## Highlights

- Columna de casillas con selección de página tri-estado, rango con Shift+clic y Esc para limpiar. La selección se reinicia sola al cambiar de página, filtro, búsqueda u orden.
- Barra de acciones flotante. En mobile queda sobre la tab bar, con 3 acciones de 44px y el resto en "More".
- My Games: Change status (con una sola fecha), Rate (con opción de incluir las runs Not Started), Favorite / Unfavorite, Add to / Remove from Up Next, Make public / Make private y Delete runs.
- My Shelf: Favorite / Unfavorite y Remove from shelf. Platinums: Remove platinum. Los borrados son inmediatos y tienen Undo; el lote se envía cuando vence el toast.

## Added

- Piezas comunes de la API en `apps/api/src/common/`: `BULK_MAX_IDS`, `BulkIdsSchema` (UUID, de 1 a 100, deduplicados), `buildBulkActionQuerySchema` y `validateBulkBodyMiddleware`, que valida el body con el schema de la acción y responde 422 `COMMON_SCHEMA_INVALID` si no corresponde.
- Endpoints `POST /users/me/backlog/bulk` (`update`, `delete`), `/users/me/queue/bulk` (`add`, `remove`), `/users/me/favorites/bulk` (`add`, `remove`), `/users/me/game-shelf/bulk` (`delete`) y `/users/me/platinums/bulk` (`delete`), con respuesta `{ data: { action, succeeded, skipped } }`.
    - El `update` de backlog admite `status`, `startedAt`, `finishedAt`, `userRating` e `isPublic`, con las mismas reglas que el `PATCH` individual. Devuelve también `queueRemoved` y registra actividad solo por las runs cuyo status cambió.
    - Los topes free (`QUEUE_LIMIT_REACHED`, `FAVORITE_LIMIT_REACHED`) responden 402 sin aplicar nada.
    - Favoritos usa un advisory lock propio por usuario y renumera sus posiciones al quitar.
- En el frontend:
    - `injectRowSelection` (`shared/utils/row-selection`): selección por ids sobre `linkedSignal`, con rango, página y `select` para dejar marcadas las omitidas.
    - Directiva `SelectionCell`: la celda entera alterna la casilla (objetivo de 44px) y no abre el editor de la fila.
    - `BulkActionBar` (`shared/components/bulk-action-bar`), presentacional, con un `role="status"` siempre presente que anuncia el conteo.
    - `injectBulkRunner` e `injectBulkRemoval`: un lote a la vez, toasts de resultado y Undo sobre `PendingRemovals`, que suma `hideAll`, `undoAll` y `commitAll`.
    - `injectBacklogBulkActions`, `BulkStatusDialog` y `BulkRatingDialog` en `features/backlog`.
    - Método `bulk(action, body)` tipado en los services de backlog, queue, favorites, game-shelf y platinum.
- `UiCheckbox` admite `indeterminate` (`aria-checked="mixed"`) y `ariaLabel`. `UiTable` resalta las filas con `aria-selected="true"`.

## Changed

- `queueService.removeByBacklogIds` concentra la salida de la queue con su lock y su compactación; la usan el `PATCH` individual, el borrado de runs y los lotes. `checkLimit` recibe la cantidad entrante.
- Los borrados individuales de backlog, game-shelf y platinum reutilizan las mismas funciones que sus lotes. `upsert-game-platinum.dto.ts` pasa a `game-platinum/dtos/`.
- Los predicados de elegibilidad (`canChangeStatus`, `canRate`, `canQuickRate`, `canAddToQueue`) pasan a `shared/utils/backlog-eligibility.ts`; los usan la tabla, la tarjeta del Diary y las acciones masivas.
- El tono por status del diálogo de cambio de status pasa a `status-dialog-tone.ts`, compartido con el diálogo masivo.

## Fixed

- La casilla de la cabecera quedaba alineada a la izquierda porque heredaba el `text-left` de la tabla. Ahora está centrada con las de las filas.

## Files of interest

- `apps/api/src/common/middlewares/validate-bulk-body.middleware.ts`
- `apps/api/src/backlog/backlog.service.ts` (`bulkUpdateBacklog`, `bulkDeleteBacklog`)
- `apps/web/src/app/shared/utils/row-selection.ts`
- `apps/web/src/app/shared/components/bulk-action-bar/bulk-action-bar.ts`
- `apps/web/src/app/features/backlog/backlog-bulk-actions.ts`

## Commits

- `69212ed3` — feat(api): add shared bulk action validation
- `c6c02230` — feat(queue): add bulk add and remove endpoint
- `18101315` — feat(backlog): add bulk update and delete endpoint
- `f1077a9a` — feat(favorites): add bulk add and remove endpoint
- `3edd753c` — feat(game-shelf): add bulk delete endpoint
- `c3b23ce4` — feat(game-platinum): add bulk delete endpoint
- `dd55dd2f` — docs(api): document bulk endpoints in bruno collection
- `b7fc941f` — docs(invariants): document bulk actions
- `b9ea29d4` — feat(ui): add indeterminate state to checkbox
- `7e80f4cf` — feat(ui): highlight selected table rows
- `634f65fa` — feat(web): add row selection and selection cell
- `5da7b13d` — feat(web): add batch operations to pending removals
- `0f99d7a5` — feat(web): add bulk action bar
- `226aa829` — feat(web): add bulk runner and bulk removal helpers
- `dd54fc60` — refactor(web): share backlog eligibility predicates
- `f4f9c517` — feat(web): add bulk endpoints to services
- `679acdef` — refactor(web): extract status dialog tone
- `d18be7bf` — feat(web): add bulk actions to my games hardcore table
- `6b27cea2` — feat(web): add bulk actions to my shelf table
- `0e3080b5` — feat(web): add bulk removal to platinums table
- `8d460867` — docs(web): document bulk selection and action bar
- `7182263a` — fix(web): center header selection checkbox
- `45f73222` — feat(backlog): allow bulk rating not started runs with a switch
- `503bbe64` — refactor(web): use the dock shadow token in the bulk action bar
