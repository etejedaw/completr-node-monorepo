# Export de colecciones

**Released:** 2026-10-27

## Summary

Cada colección propia del usuario se puede descargar como CSV, y como JSON si el usuario es premium: My Games, Up Next, My Shelf, Want to Get, Favorites, Platinums y las listas propias. El archivo se genera en la API, que es la que aplica el gating del formato, lee la colección completa sin paginar y aplica la regla de propiedad de las listas. El formato se negocia con el header `Accept` en vez de un query param, y cada endpoint acepta los mismos filtros, búsqueda y orden que su listado, de modo que el archivo trae lo mismo que la vista muestra. En el frontend, un único componente, `ExportActions`, pone los botones al final de la barra de herramientas de cada vista y les pasa el estado actual de la vista.

## Highlights

- Siete endpoints `GET .../export`, con CSV para todos y JSON solo premium (402 `EXPORT_FORMAT_PREMIUM` para free).
- Formato por `Accept`: `text/csv` por defecto, `application/json` y 406 `EXPORT_FORMAT_NOT_ACCEPTABLE` para cualquier otro, con `Vary: Accept`.
- El export respeta los filtros, la búsqueda y el orden activos de la vista. Sin parámetros sale la colección completa.
- `UiButton` suma la variante `premium` (dorada) y `ExportActions` acompaña el botón JSON con un `ui-premium-badge` que explica el perk.

## Added

- Endpoints de export: `GET /users/me/backlog/export`, `/users/me/queue/export`, `/users/me/game-shelf/export`, `/users/me/wishlist/export`, `/users/me/favorites/export`, `/users/me/platinums/export` (registrado en `users.routes`) y `GET /lists/:listId/export`. Cada módulo aporta una consulta `find*ForExport` con un solo `include` y un `<modulo>.export-row.mapper.ts` con sus columnas.
- Piezas comunes en `apps/api/src/common`:
    - `serialize-csv.util`: BOM UTF-8, `\r\n`, escape RFC 4180, y prefijo `'` en los textos que empiezan con `=`, `+`, `-`, `@`, tab o CR, contra la inyección de fórmulas.
    - `send-export.util`: `Content-Type`, `Content-Disposition` con `completr-<recurso>-YYYY-MM-DD.<ext>` (fecha UTC) y cuerpo.
    - `export-format-negotiation.middleware`: resuelve el formato con `req.accepts` y responde `Vary: Accept`.
    - `export-format-access.middleware`: corta con 402 antes de consultar si un free pide JSON.
    - `is-premium-role.util`.
    - Schemas `export-search-query` y `export-platform-search-query`.
    - `platform-filter-where.util`.
- Errores `EXPORT_FORMAT_PREMIUM` (402) y `EXPORT_FORMAT_NOT_ACCEPTABLE` (406) en el `Common Module`.
- Parámetros de filtro por endpoint:
    - El backlog acepta todo `BacklogQuerySchema` salvo `limit` y `offset` (`backlog-export-query.schema`).
    - Up Next acepta `search` y `sort` (`manual`, `ratio`, `score`, `duration`), que replica en el servidor el orden de cliente de la vista (`sort-queue-export.util`).
    - My Shelf, Want to Get y Platinums aceptan `search` y `platform` (UUID o `any` para las filas sin plataforma), igual que `matchesPlatform` del frontend.
    - Favorites acepta `search`.
    - Las listas no aceptan parámetros extra.
- Columnas:
    - **backlog**: `gameTitle`, `platform`, `status`, `score`, `duration`, `ratio`, `realDuration`, `personalRatio`, `userRating`, `startedAt`, `finishedAt`, `notes`, `addedAt`.
    - **queue**: `position`, `gameTitle`, `platform`, `status`, `score`, `duration`, `ratio`, `addedAt`.
    - **game-shelf**: `gameTitle`, `platform`, `edition`, `acquiredAt`, `notes`, `addedAt`.
    - **wishlist**: `position`, `gameTitle`, `platform`, `addedAt`.
    - **favorites**: `position`, `gameTitle`, `addedAt`.
    - **platinums**: `gameTitle`, `platform`, `platinumedAt`, `notes`.
    - **list**: `position`, `gameTitle`, `score`, `duration`, `ratio`, `addedAt`.
- `ExportService` (`core/services/export.ts`): pide el archivo con `observe: "response"`, `responseType: "blob"` y el header `Accept`, toma el nombre de `Content-Disposition` y descarga con `URL.createObjectURL` y un `<a download>` temporal.
- `ExportActions` (`shared/components/export-actions`):
    - Inputs `resource`, `label` y `params`.
    - Botón "CSV" para todos, y "JSON" con `*appPremiumOnly` y `ui-premium-badge interactive`.
    - Spinner y `aria-busy` mientras descarga.
    - Se usa en My Games, Up Next, My Shelf, Want to Get, Favorites, Platinums y el detalle de una lista propia. Cada vista le pasa sus filtros como un `computed`, y el componente se oculta mientras la vista carga y en las vistas `readonly`.
- Variante `premium` de `UiButton`, con los tokens `--color-premium` de cada tema.
- Mensaje de `EXPORT_FORMAT_PREMIUM` en `plan-limit-message.ts`.
- Colección Bruno: un request por endpoint, en `docs/api/{backlog,queue,game-shelf,wishlist,favorites,lists}/export.yml` y `docs/api/game-platinum/export-my-platinums.yml`.

## Changed

- `cors.config` expone `Content-Disposition` (`exposedHeaders`) para que el frontend pueda leer el nombre del archivo.
- `errorInterceptor` lee y parsea como JSON los cuerpos de error que llegan como `Blob` antes de decidir el toast, así que un 402 de una descarga muestra `toast.premium` como cualquier otro tope.
- `backlog-list` extrae el orden a `withSort`, que ahora usan tanto `loadBacklog()` como el export.
- `favorites-view` suma `min-w-[12rem]` al buscador para que no se encoja cuando la barra hace wrap.
- `docs/invariants.md` documenta las reglas del export y `docs/context/frontend.md` documenta la variante `premium` y el patrón de descarga.

## Files of interest

- `apps/api/src/common/utils/serialize-csv.util.ts`
- `apps/api/src/common/utils/send-export.util.ts`
- `apps/api/src/common/middlewares/export-format-negotiation.middleware.ts`
- `apps/api/src/common/middlewares/export-format-access.middleware.ts`
- `apps/api/src/backlog/backlog.export-row.mapper.ts`
- `apps/api/src/queue/sort-queue-export.util.ts`
- `apps/api/test/common/export.integration.test.ts`
- `apps/web/src/app/core/services/export.ts`
- `apps/web/src/app/shared/components/export-actions/export-actions.ts`
- `apps/web/src/app/core/interceptors/error.interceptor.ts`

## Commits

- `ff2dc60b` — feat(api): add shared csv and json export helpers
- `4f434009` — feat(backlog): add backlog export endpoint
- `c66c65ba` — feat(queue): add queue export endpoint
- `c21799bb` — feat(game-shelf): add game shelf export endpoint
- `2bd5e99e` — feat(wishlist): add wishlist export endpoint
- `7b004004` — feat(favorites): add favorites export endpoint
- `6c4539a7` — feat(game-platinum): add platinums export endpoint
- `0b414387` — feat(lists): add own list export endpoint
- `3ae6820c` — test(api): cover collection exports and csv serialization
- `ce805b6e` — docs(api): document collection export endpoints
- `15ff1ccd` — docs(invariants): document collection export rules
- `8c76bec0` — feat(web): add premium variant to the button
- `3fb74ccf` — feat(web): parse blob error bodies and add the export premium message
- `f604bad6` — feat(web): add the collection export service
- `413de5c4` — feat(web): add the csv and json export actions
- `b57c5692` — feat(web): add export actions to the library views and own lists
- `1ee8bef0` — docs(web): document the premium button and the export pattern
- `afb428e2` — feat(api): negotiate the export format with the accept header
- `c1f21e2e` — feat(api): add shared search and platform export filters
- `e1199e63` — feat(backlog): apply the listing filters to the backlog export
- `5738558d` — feat(queue): apply search and sort to the queue export
- `f61154ce` — feat(game-shelf): apply search and platform filters to the shelf export
- `47e0eb37` — feat(wishlist): apply search and platform filters to the wishlist export
- `412dd355` — feat(favorites): apply search to the favorites export
- `9f89d654` — feat(game-platinum): apply search and platform filters to the platinums export
- `89e29f89` — feat(lists): negotiate the list export format and drop the game code column
- `11902f59` — test(api): cover export negotiation, filters and sorting
- `b443a423` — docs(api): document export negotiation and filters
- `dc41db03` — docs(invariants): document export negotiation and filters
- `f4a8c828` — feat(web): request the export format with the accept header and send view params
- `cb2359f8` — feat(web): pass the view params through the export actions
- `1c55b413` — feat(web): export the collections with their active filters and sort
- `4ddc2f8c` — docs(web): document the export accept header and view params
- `80e0eb5a` — feat(web): explain the json export perk with the premium badge
- `9fd545b4` — docs(web): document the json export premium badge
