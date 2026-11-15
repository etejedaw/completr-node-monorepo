# Estado de error con reintento y cargas que no se pisan en la web

**Released:** 2026-11-15

## Summary

Las listas de `apps/web` trataban un fallo de carga como una lista vacía y no cancelaban la petición anterior al cambiar de filtro o de página. Un helper único, `injectLatestLoader`, cancela la carga previa y expone si la última falló, y el componente `ui-load-error` muestra el error con reintento.

## Highlights

- Ante un 5xx o un fallo de red, backlog, My Shelf, Up Next, Want to Get, favoritos, platinos, listas y tags muestran "Try again" en vez del estado vacío.
- Un 5xx en la ficha de un juego ya no se ve como "Game not found".
- Una respuesta lenta ya no pisa los resultados del filtro actual.

## Added

- `shared/ui/empty-state/ui-load-error.ts` y el estado `error` de `app-library-page`, que emite `retried`.
- `shared/utils/inject-latest-loader.ts`: `load(source, { next, error })`, `cancel()` y la señal `failed`.

## Fixed

- `/backlog?savedFilterId=` ya no se queda en esqueleto si falla `GET /saved-filters`: carga sin vista guardada y avisa.
- `games-browse` cancela la petición en vuelo al limpiar los filtros, y `inject-view-stats` al cambiar de vista guardada.
- `localStorage` directo en `backlog-list`, `inject-view-stats`, `platinum-list`, `platinum-collection` y `game-shelf-list` pasa por `StorageService`, así que el almacenamiento bloqueado no rompe la página.
- `backlog-modal` cancela sus lecturas al destruirse. Las escrituras no se cancelan, para no dejar un guardado a medias.
- `settings-privacy` construye su borrador con un objeto tipado en vez de un cast.

## Changed

- `backlog-list` sustituye su contador `loadSeq` por el helper.
- `docs/context/frontend.md` nombra `injectLatestLoader` y `ui-load-error` en la regla de respuestas desordenadas.

## Files of interest

- `apps/web/src/app/shared/utils/inject-latest-loader.ts`
- `apps/web/src/app/shared/ui/empty-state/ui-load-error.ts`
- `apps/web/src/app/shared/components/library-page/`
- `apps/web/src/app/features/backlog/backlog-list/backlog-list.ts`

## Commits

- `69d67f00` — feat(ui): add load error state and latest loader helper
- `dc83d933` — fix(web): show a retryable error on platinum list load failures
- `1bdb3f48` — fix(web): show a retryable error on game shelf load failures
- `c004e0e0` — fix(web): show a retryable error on favorites load failures
- `c18c0e04` — fix(web): show a retryable error on wishlist load failures
- `cc7d39ea` — fix(web): show a retryable error on queue load failures
- `eed0e2f5` — fix(web): show a retryable error on lists overview load failures
- `5cae7a99` — fix(web): show a retryable error on tags load failures
- `bacf7d61` — fix(web): show a retryable error on game detail and catalog load failures
- `39a38365` — fix(web): harden backlog loading against failures, stale responses and blocked storage
- `f6d610c5` — fix(web): cancel backlog modal reads when it is destroyed
- `9c7ed3b2` — refactor(settings): build the privacy draft from a typed literal
- `319ea1c1` — docs(frontend): document the latest loader and load error state
- `ce44fda2` — test(web): point the platinum erratic spec at the core platinum service
