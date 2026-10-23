# Specs de shared, core y games

**Released:** 2026-10-22

## Summary

La suite del frontend suma specs para las piezas compartidas de `core/` y `shared/`, que usan varias pantallas a la vez, y para los subcomponentes de la ficha de juego, el buscador y Browse. Siguen los patrones de `docs/context/frontend.md`. No hay cambios de código de la app; los bugs que encontraron se corrigieron en commits aparte.

## Highlights

- Componentes compartidos de mayor uso: buscador de juegos, pósters, `option-picker`, `platform-filter`, `password-rules`, `swipe-actions` y más.
- Services de `core` con estado (`theme`, `toast`, `onboarding`, `viewport`, `pointer`, `dialog`) y sus utils.
- Ficha de juego (hero, reseñas, runs, score card, actividad social, admin bar), `injectGameSearch` y `games-browse` con filtros, paginado y hero.

## Added

- 41 specs nuevos en `apps/web/src/app/core/**` y `apps/web/src/app/shared/**`.
- Specs de `game-detail/components/*`, `game-search.spec.ts`, `games-browse.spec.ts`, `browse-filters.spec.ts` y `browse-hero.spec.ts`.

## Changed

- `profile-collection-page.spec.ts` busca dentro del componente renderizado: los toasts que otro spec deja en `document.body` lo hacían fallar según el orden de ejecución.

## Files of interest

- `apps/web/src/app/shared/components/game-search/game-search-step.spec.ts`
- `apps/web/src/app/core/services/toast.spec.ts`
- `apps/web/src/app/features/games/games-browse/games-browse.spec.ts`

## Commits

- `2235b360` — test(web): add specs for core and shared
- `fbbf8852` — test(web): add specs for game detail components
- `536f793e` — test(web): add game search specs
- `059853c8` — test(web): add games browse specs
- `243a431f` — test(web): scope profile collection count queries to the rendered page
