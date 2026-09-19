# Favorito inline en las vistas de biblioteca

**Released:** 2026-06-17

## Summary

Marcar un juego como favorito ya no obliga a ir a su ficha. `favorites` expone los ids favoritos como signal reactivo con carga en bloque, y el backlog, la cola, el shelf y la wishlist muestran una estrella para alternar el favorito en cada fila.

## Added

- Signal reactivo de ids favoritos y loader en bloque en el servicio de `favorites`.
- Estrella de favorito inline en `backlog-list`, `queue-view`, `game-shelf-list` y `wishlist-view`.

## Files of interest

- `apps/web/src/app/features/favorites/favorites.ts`

## Commits

- `b9e01a23` — feat(favorites): add reactive favorite ids signal and bulk loader
- `9a4eec3b` — feat(favorites): show inline favorite star in backlog, queue, shelf and wishlist
