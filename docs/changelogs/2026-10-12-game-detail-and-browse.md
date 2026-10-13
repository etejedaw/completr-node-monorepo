# Detalle de juego y exploración: componentes y nuevo diseño

**Released:** 2026-10-12

## Summary

La página de detalle de juego y la de exploración se dividen en componentes con responsabilidad acotada y se rediseñan con el póster del juego como pieza central. Se agregan componentes compartidos (`poster-shelf`, `list-card`) y `review-card` pasa a mostrar autores para renderizar las reseñas del juego. La ruta de detalle de género desaparece: los géneros enlazan al explorador con el filtro aplicado. Es solo frontend.

## Highlights

- `game-detail` queda como orquestador de componentes en `features/games/game-detail/components/`.
- `games-browse` separa hero y filtros en `browse-hero` y `browse-filters`.
- Las reseñas del juego se renderizan con `review-card`.
- Los géneros enlazan a `games-browse` con el filtro; se elimina `genre-detail`.

## Added

- Componentes de detalle: `game-hero`, `game-library-actions`, `game-score-card`, `game-poster-grid`, `game-runs`, `game-admin-bar`, `game-dlc-list`, `game-featured-lists`, `game-section` y `game-reviews`.
- Componentes de exploración: `browse-hero` y `browse-filters`.
- Componentes compartidos `poster-shelf` y `list-card`; `poster-shelf` permite desactivar el sangrado de página.
- `expandable-text` admite recorte a cuatro líneas.
- `review-card` puede mostrar el autor de la reseña.
- Campo `coverUrl` en `game.model`.

## Changed

- `game-detail.html` y `games-browse.html` se reducen a la composición de sus componentes.
- `game-cover-card` renderiza con el póster del juego.
- `game-reviews-tab` se renombra a `game-reviews` y usa `review-card`.
- Las rutas de género en `app.routes.ts` redirigen a `games-browse` con el filtro de género.

## Removed

- La página `genre-detail` y su entrada en `games.ts`.

## Files of interest

- `apps/web/src/app/features/games/game-detail/game-detail.ts` — composición del detalle.
- `apps/web/src/app/features/games/game-detail/components/game-hero.ts` — hero del juego.
- `apps/web/src/app/features/games/games-browse/games-browse.ts` — estado del explorador y filtro por género.
- `apps/web/src/app/shared/components/poster-shelf/poster-shelf.ts` — estantería de pósters.

## Commits

- `8fa4ac99` — feat(games): expose cover url on game model
- `0dde239d` — refactor(games): split game detail page into focused components
- `3e94028d` — refactor(games): finish splitting game detail into components
- `adac1e12` — feat(shared): add poster shelf and list card components
- `367a514d` — style(games): render cover cards with the game poster
- `2730e299` — refactor(games): split game browse page into components
- `a4efb3c2` — feat(shared): let poster shelf opt out of page bleed
- `290f79a8` — feat(shared): let expandable text clamp to four lines
- `c711973f` — feat(shared): let review card show review authors
- `fbfcb93b` — refactor(games): render game reviews with review card
- `a5125f94` — refactor(web): link genres to games filter and drop genre detail
