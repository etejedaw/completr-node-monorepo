# Rediseño de My Shelf, Want to Get y Favorites

**Released:** 2026-10-12

## Summary

My Shelf, Want to Get y Favorites adoptan el mismo lenguaje visual que el resto de la biblioteca: `LibraryHero` arriba, barra de herramientas común y grilla de portadas. Es solo frontend. En el camino se extraen cuatro componentes compartidos (`CoverGrid`, `LibraryToolbar`, `PlatformFilter` y el modo móvil de `GameCoverCard`) para que las tres vistas dejen de repetir marcado y estilos. My Shelf prueba primero una tarjeta propia (`shelf-entry-card`) y la descarta en favor de `GameCoverCard`, que ya resuelve el caso táctil.

## Highlights

- My Shelf con hero, modos de vista y filtro de plataforma compartido.
- Want to Get y Favorites con hero y tarjetas de portada, sobre la misma grilla.
- Las acciones de `GameCoverCard` aumentan de tamaño con puntero táctil y pasan a una barra propia en móvil.
- Favorites permite deshacer la eliminación de un juego.

## Added

- `shared/components/cover-grid`: grilla de portadas reutilizable.
- `shared/components/library-toolbar`: barra de herramientas de las vistas de biblioteca.
- `shared/components/platform-filter`: filtro de plataforma extraído de My Shelf.
- Modo de acciones en barra móvil en `game-cover-card`.

## Changed

- `game-shelf-list` usa `LibraryHero`, modos de vista, `PlatformFilter`, `CoverGrid` y `LibraryToolbar`.
- `wishlist-view` renderiza con `LibraryHero` y tarjetas de portada, y usa `CoverGrid` y `LibraryToolbar`.
- `favorites-view` adopta `LibraryHero`, `CoverGrid` y eliminación con deshacer.
- La vista móvil de My Shelf usa tarjetas de portada en lugar de tarjetas con swipe.

## Removed

- `shelf-entry-card`, introducido y retirado dentro de esta misma entrega.

## Files of interest

- `apps/web/src/app/shared/components/game-cover-card/game-cover-card.ts`
- `apps/web/src/app/shared/components/cover-grid/cover-grid.ts`
- `apps/web/src/app/shared/components/library-toolbar/library-toolbar.ts`
- `apps/web/src/app/shared/components/platform-filter/platform-filter.ts`
- `apps/web/src/app/features/game-shelf/game-shelf-list/`
- `apps/web/src/app/features/wishlist/wishlist-view/`
- `apps/web/src/app/features/favorites/favorites-view/`

## Commits

- `e8d4aa6d` — feat(shelf): add shelf entry card component
- `3c74d16b` — feat(shelf): redesign shelf list with library hero and view modes
- `9f6f7927` — fix(shared): enlarge cover card actions on touch pointers
- `b1671149` — refactor(shelf): render mobile shelf with cover cards instead of swipe cards
- `c0abe60f` — feat(shared): show cover card actions in a mobile bar
- `287125f5` — feat(shared): add platform filter component
- `b3b905a3` — refactor(shelf): use shared platform filter
- `0394eee7` — feat(wishlist): render want to get with library hero and cover cards
- `dadd661a` — feat(shared): add cover grid and library toolbar components
- `d04c54fc` — refactor(shelf): use shared cover grid and library toolbar
- `54782a87` — refactor(wishlist): use shared cover grid and library toolbar
- `b4cd296f` — feat(favorites): adopt library hero, cover grid and undoable removal
