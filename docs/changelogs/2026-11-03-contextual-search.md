# Búsqueda contextual

**Released:** 2026-11-03

## Summary

En las páginas con lista, el shell autenticado mostraba dos buscadores parecidos: la búsqueda global de la barra superior y el `ui-search-bar` que filtraba la lista de la página. Se unifican en una sola barra superior contextual. Una página que filtra su lista monta `app-page-search`; dentro del `Layout` ese componente registra su alcance en `PageSearchScope` y no dibuja nada, y la barra superior muestra el chip "In <sección>" y filtra la página en vivo. Al quitar el chip, la misma barra vuelve a buscar en todo Completr. Fuera del `Layout` (visitantes en `GuestShell`, specs con `TestBed`) `app-page-search` sigue dibujando el campo de la página.

## Highlights

- Un solo campo de búsqueda visible por página, en escritorio y en mobile.
- El chip "In My Games" se quita con su ✕, con Backspace en el campo vacío o desde el desplegable, y vuelve a ponerse con "Filter <sección> by …".
- En mobile, la barra superior se convierte en el campo con chip y la lista sigue visible mientras se filtra.
- Barra más grande: 44px de alto, texto de 15px (16px en mobile) y barra superior de 56px.

## Added

- `PageSearchScope` (`core/services/page-search-scope.ts`), provisto por el `Layout`: un alcance activo a la vez (`label`, `placeholder`, `ariaLabel`, `value`, `setValue`), que el último registro reemplaza y que se limpia solo al destruirse la página.
- `app-page-search` (`shared/components/page-search`): con alcance disponible se registra y queda oculto; sin él dibuja `ui-search-bar` con las mismas entradas (`scopeLabel`, `placeholder`, `ariaLabel`, `size`, `value`, `valueChange`).
- `SearchScopeChip` (`layout/search-scope-chip`), compartido por las variantes de la barra.
- Variantes de `GlobalSearch`: `inline` (escritorio), `compact` (barra mobile con chip, sin desplegable, que emite `searchedEverywhere`) y `overlay` (`MobileSearchOverlay`, que acepta `initialQuery`). Las tres comparten la lógica de chip, teclado y búsqueda.

## Changed

- Migradas a `app-page-search` 19 páginas: My Games, Saved views, Favorites, My Shelf, Platinums, Want to Get, Tags, Up Next (`queue-browser`, con el input `scopeLabel`), Sagas, Browse, Lists, Users, las vistas del perfil público (biblioteca, conexiones, listas, colecciones y Up Next) y Admin → Games, Users y Sagas. Los placeholders pasan de "Search…" a "Filter by title…" o "Filter by name…". Los buscadores de diálogos y de "agregar" siguen con `ui-search-bar`.
- `GlobalSearch`: modo con alcance (nombre accesible "Filter <sección>", `role="status"` con el modo), Escape en dos pasos (primero borra el texto) y Enter sin efecto mientras se filtra. El atajo `/` se conserva.
- `app-library-toolbar` se oculta cuando no le queda ningún hijo visible, para que las páginas cuyo único control era el campo no muestren una franja vacía.
- `--topbar-height` pasa de `3.5rem` a `4rem`. El campo mide 44px, el ancho máximo en escritorio sube a `max-w-2xl` y el chip mide 30px con texto de 13px.

## Files of interest

- `apps/web/src/app/core/services/page-search-scope.ts`
- `apps/web/src/app/shared/components/page-search/page-search.ts`
- `apps/web/src/app/layout/global-search/global-search.ts`
- `apps/web/src/app/layout/layout.html`

## Commits

- `28a5003a` — feat(web): add page search component contract
- `0cd78cfb` — feat(web): add page search scope service
- `d788b08b` — feat(web): register page search in the layout scope
- `0d1e2d91` — feat(web): filter the scoped page from the global search bar
- `b2a6e7df` — feat(web): add scoped search field to the mobile topbar
- `31173ba8` — docs(web): document contextual search
- `c7040fba` — refactor(web): use page search in the backlog list
- `802f2ad3` — refactor(web): use page search in saved views
- `3ccebf40` — refactor(web): use page search in favorites
- `a2bfd7a6` — refactor(web): use page search in the game shelf
- `142f4774` — refactor(web): use page search in platinums
- `8ea62277` — refactor(web): use page search in want to get
- `9b359108` — refactor(web): use page search in tags
- `4a17af30` — refactor(web): use page search in up next
- `cc617bcd` — refactor(web): use page search in sagas
- `a510cf6b` — feat(web): use page search in admin games, users and sagas
- `1ca34ca7` — feat(web): use page search in public profile pages
- `3e17d288` — feat(web): use page search in browse, lists and users discover
- `e82b3ede` — fix(web): hide the library toolbar when the page search moves to the topbar
- `2a9a4a56` — refactor(web): merge the mobile scoped search into the global search
- `1fa38fbe` — docs(web): document the compact global search variant
- `f7536bd4` — style(web): enlarge the topbar search bar and scope chip
