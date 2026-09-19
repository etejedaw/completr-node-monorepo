# Membresías por ids y portadas redimensionadas (frontend)

**Released:** 2026-07-05

## Summary

Complemento de frontend de `2026-07-05-membership-ids-endpoints.md`. Para saber si un juego está en la wishlist, en favoritos o en el backlog, el frontend pedía páginas completas de esos listados. Ahora usa los endpoints de ids y el flag `inBacklog` que devuelve el servidor. Además, las portadas de RAWG se piden redimensionadas.

## Changed

- Wishlist, favoritos, cola y `game-detail` cargan sus membresías con los endpoints de ids.
- Shelf y favoritos usan el flag `inBacklog` del servidor en lugar de pedir el backlog.
- `backlog-list` carga el listado sin esperar a las vistas guardadas.
- Pipe `cover-url` que redimensiona las portadas de RAWG, aplicado en cards y en la celda de título.

## Files of interest

- `apps/web/src/app/shared/pipes/cover-url.ts`
- `apps/web/src/app/features/wishlist/wishlist.ts`
- `apps/web/src/app/features/favorites/favorites.ts`

## Commits

- `da31f3cb` — perf(shared): add rawg cover resize pipe to grid cards and title cell
- `dd80f388` — perf(backlog): resize covers and decouple list load from saved filters
- `fee39df2` — perf(game-shelf): use server inBacklog flag instead of backlog page fetch
- `8228c08c` — perf(favorites): use server inBacklog flag and game-ids endpoint
- `c36d00d5` — perf(wishlist): back membership checks with game-ids endpoint
- `dcd1cef6` — perf(queue): fetch queue backlog ids via lightweight endpoint
- `0dd23571` — perf(game-detail): load membership sets via ids endpoints
