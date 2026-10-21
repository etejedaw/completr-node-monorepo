# Nombres accesibles en el frontend

**Released:** 2026-10-21

## Summary

Los tests de interacción, que consultan la pantalla por rol y nombre accesible, mostraron controles sin nombre o con nombres poco útiles para un lector de pantalla. Se corrigen sin cambios visuales y los specs pasan a usar esos nombres.

## Fixed

- `ui-search-bar`: el input tiene `aria-label` (nuevo input `ariaLabel`, por defecto el placeholder sin los puntos suspensivos); My Games, Want to Get y Lists pasan un nombre explícito.
- `game-cover-card`: los nombres de las acciones incluyen el título del juego.
- `backlog-entry-card`: nombre accesible corto ("Título, Estado") con el detalle en `aria-describedby`.
- `wishlist-platform-choice`: el `radiogroup` de plataformas se llama "Pick a platform (optional)".

## Changed

- Los specs de interacción de My Games y Want to Get consultan por nombre accesible en vez de por placeholder.
- `docs/context/frontend.md` documenta el uso de nombres accesibles en los tests.

## Files of interest

- `apps/web/src/app/shared/ui/search-bar/ui-search-bar.ts`
- `apps/web/src/app/shared/components/game-cover-card/game-cover-card.ts`
- `apps/web/src/app/shared/components/backlog-entry-card/`

## Commits

- `4e4d6566` — feat(web): add accessible name to search bar input
- `2cce9a8e` — fix(web): include game title in cover card action names
- `b6b2d218` — fix(web): give backlog entry card a short accessible name
- `89b498ff` — fix(web): name the platform radiogroup in wishlist dialog
- `ffe0df96` — test(web): query interaction specs by accessible name
- `47eb21ae` — docs(web): document accessible names in frontend tests
