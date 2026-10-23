# Paginado de Browse y debounce del buscador

**Released:** 2026-10-22

## Summary

Los specs nuevos de `features/games` encontraron tres bugs: el paginado de Browse volvía siempre a la primera página, el buscador de juegos consultaba con cada tecla y los estantes de Browse no manejaban los errores.

## Fixed

- `games-browse`: `filtersEffect` llama a `onFiltersChanged` dentro de `untracked`. Antes también seguía `filteredOffset` y `searchQuery`, así que "Next page" volvía a disparar el effect, reseteaba el offset a 0 y recargaba la página 1.
- `injectGameSearch` (`game-search.ts`): el debounce usa `timer` dentro del `switchMap`. `debounceTime` sobre `of(term)` emitía al completarse la fuente, así que la búsqueda salía con cada tecla.
- `games-browse`: el spotlight de género, los últimos reseñados, las listas oficiales y recientes, géneros y plataformas manejan el error y dejan el estante vacío. La búsqueda online deja de quedar en "searching" si falla, y un fallo de la búsqueda local ya no corta el stream del buscador.

## Files of interest

- `apps/web/src/app/features/games/games-browse/games-browse.ts`
- `apps/web/src/app/features/games/game-search.ts`

## Commits

- `379c976e` — fix(web): wait for the debounce before searching games
- `a4e5eb8a` — fix(web): keep the browse page on pagination and handle failed shelf requests
