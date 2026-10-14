# LibraryPage, QueueBrowser y My Games en componentes hijos

**Released:** 2026-10-14

## Summary

Refactor sin cambio de comportamiento. Las páginas de colección repetían la misma estructura (barra, esqueleto, sin resultados, vacío, contenido y paginación); ahora la arma `LibraryPage` y cada vista solo aporta su barra, su acción del vacío y su contenido. Up Next propio y público comparten `QueueBrowser`. La plantilla de My Games, que superaba las 1400 líneas, se divide en ocho componentes hijos.

## Highlights

- Una sola estructura para My Shelf, Want to Get, Favorites y las colecciones del perfil.
- `/queue` y `/user/:u/queue` comparten la página completa, no solo las filas.
- `backlog-list.html` baja de unas 1460 a unas 450 líneas.

## Added

- `LibraryPage` (`shared/components/library-page`): input `state` (`loading` / `empty` / `no-matches` / `ready`), plantillas `appLibraryPageToolbar`, `appLibraryPageEmptyAction` y `*appLibraryPageContent`, y paginación.
- `QueueBrowser` (`features/queue/queue-browser`): búsqueda y orden, destacado, lista, vacíos y paginación de Up Next; el vacío propio de cada página va en `<ng-template #emptyQueue>`.
- Hijos de My Games en `features/backlog/components/`: `saved-view-stats`, `saved-view-stats-panel`, `backlog-filters-panel`, `status-change-dialog`, `reorder-views-dialog`, `entry-status-sheet`, `entry-rating-sheet` y `backlog-tools-sheet`.

## Changed

- `wishlist-view`, `game-shelf-list`, `favorites-view` y `ProfileCollectionPage` se renderizan sobre `LibraryPage`.
- `queue-view` y `user-queue` delegan en `QueueBrowser`.
- `docs/context/frontend.md` documenta `LibraryPage` y `QueueBrowser`.

## Files of interest

- `apps/web/src/app/shared/components/library-page/`
- `apps/web/src/app/features/queue/queue-browser/`
- `apps/web/src/app/features/backlog/backlog-list/backlog-list.html`

## Commits

- `d08561b9` — refactor(web): add library page component for collection views
- `3ce21152` — refactor(wishlist): render wishlist view with library page
- `16ba9cc8` — refactor(game-shelf): render shelf list with library page
- `9c35c937` — refactor(favorites): render favorites view with library page
- `d7c5ae97` — refactor(public-profile): render collection page with library page
- `978de580` — refactor(backlog): split my games list into child components
- `36a280ef` — refactor(queue): share up next page layout through queue browser
- `dbfb4541` — docs(web): document library page and queue browser components
