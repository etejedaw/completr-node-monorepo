# Paleta de búsqueda y filtro de página con conteo

**Released:** 2026-11-14

## Summary

La barra superior contextual (una sola barra que filtraba la página con el chip "In <sección>" y, al quitarlo, buscaba en todo Completr) mezclaba dos cosas en el mismo campo y alejaba el filtro de la lista. Se reemplaza por dos piezas separadas. La búsqueda global pasa a ser `SearchPalette`: la barra superior es un botón que la abre (también con `/`), en escritorio como panel centrado y en mobile a pantalla completa, y busca primero en la biblioteca propia. Cada página vuelve a dibujar su filtro con `app-page-search`, que ahora dice qué filtra y cuántos elementos hay ("Filter 612 games by title") y, mientras se escribe, cuántos coinciden. Se eliminan `PageSearchScope`, `GlobalSearch`, `MobileSearchOverlay` y `SearchScopeChip`.

## Highlights

- Botón "Search Completr" del mismo tamaño que la barra anterior (44px, hasta `max-w-2xl`), con el atajo `/`; en mobile, el ícono de lupa.
- La paleta muestra "In your library" primero (run, plataforma y estado), después Games, Players y Lists, y al final "Search the full catalog", que abre Browse. Los chips All, My library, Games, Players y Lists acotan sin otra petición.
- Un solo campo de texto visible por página: el filtro de su lista, con el total y las coincidencias.
- "See all N in My Games" abre My Games filtrado con `?search=`.

## Added

- `SearchPalette` (`layout/search-palette`): `combobox` con `aria-activedescendant` sobre un `listbox` agrupado por sección. ↑/↓ recorren todas las opciones y dan la vuelta, Enter abre la activa, el primer Esc borra el texto y el segundo cierra, y un clic en el fondo también cierra. La búsqueda espera 250 ms, pide desde 2 caracteres y `switchMap` descarta respuestas viejas. El foco vuelve al disparador al cerrar.
- `SearchPaletteOption`: el contenido de cada opción según su tipo (run, "See all", juego, jugador, lista, catálogo).
- `search-palette-sections.ts`: arma las secciones a partir de los resultados y el alcance. Con All muestra 3 runs, 5 juegos, 4 jugadores y 4 listas; con un alcance, hasta 10.
- `HighlightMatch` (`shared/components/highlight-match`): marca con `<mark>` la primera coincidencia del texto buscado, sin distinguir mayúsculas.
- `GlobalSearchService.search` suma `library` (`GET /users/me/backlog?search=&limit=10`, con `entries` y `total`) a usuarios, juegos y listas.
- `UiSearchBar`: `icon` (por defecto `search`) y `hint`, un `role="status"` que se muestra solo con texto escrito.
- `ChipGroup`: `layout` (`wrap` o `scroll`, una fila con scroll horizontal) y `touchTarget`, que pasa a cada chip.
- My Games aplica `?search=` al entrar: limpia los filtros, ignora la vista por defecto y carga la búsqueda.

## Changed

- `app-page-search` deja de registrarse en la barra superior y siempre dibuja `ui-search-bar` con el ícono `filter_list`. Entradas nuevas: `noun`, `nounPlural`, `filterBy`, `count` y `loading`; se quitan `scopeLabel` y `placeholder`. El nombre accesible por defecto es "Filter <plural> by <campo>".
- Las 17 páginas con filtro pasan su `count` (el total de la API si paginan, el largo de la lista si filtran en el cliente) y `loading`. `QueueBrowser` y `ProfileCollectionPage` pierden los inputs de placeholder y alcance.
- Browse usa `ui-search-bar` con "Search the catalog...": busca en el catálogo, no filtra una lista.
- Admin → Sagas quita su anuncio "N matches" para lectores de pantalla y Admin → Users deja su texto visible sin `role="status"`, porque el filtro ya anuncia las coincidencias.
- Help llama "filter" al campo de My Games junto al menú View.
- `docs/rules.md`: la sección "Búsqueda" reemplaza a "Búsqueda contextual", y el catálogo de componentes anota `SearchPalette` como el único overlay que no es `UiDialog`.

## Removed

- `PageSearchScope`, `GlobalSearch` (variantes `inline`, `compact` y `overlay`), `MobileSearchOverlay` y `SearchScopeChip`.

## Files of interest

- `apps/web/src/app/layout/search-palette/search-palette.ts`
- `apps/web/src/app/layout/search-palette/search-palette-sections.ts`
- `apps/web/src/app/shared/components/page-search/page-search.ts`
- `apps/web/src/app/layout/layout.html`

## Commits

- `493290e3` — feat(ui): add icon and match hint to the search bar
- `1231d5d2` — feat(web): add scroll layout and touch target to the chip group
- `2706945f` — feat(web): add highlight match component
- `909b938d` — feat(web): turn page search into a list filter with item count
- `48e60bbd` — feat(web): pass the item count to every page filter
- `774656eb` — feat(backlog): open my games filtered by the search query param
- `7a091b35` — refactor(games): use the catalog search bar in browse
- `6ceca0d8` — feat(web): search your library from the global search service
- `b3bff759` — feat(web): add the search palette
- `22c11709` — feat(web): replace the contextual topbar search with the search palette
- `f099aefd` — docs(web): document the search palette and page filters
- `a40606ba` — docs(help): call the my games field a filter
