# Otros jugadores en la ficha del juego (frontend)

**Released:** 2026-06-21

## Summary

Complemento de frontend de `2026-06-21-game-players-endpoint.md`. La ficha del juego consume `GET /games/:id/players` en una sección "Other Players" con un punto de color según el estado de cada jugador.

## Added

- Sección "Other Players" en `game-detail`.
- Entradas de What's New del 2026-06-21 (follow requests y Other Players).

## Files of interest

- `apps/web/src/app/features/games/game-detail/game-detail.ts`
- `apps/web/src/app/features/games/games.ts`

## Commits

- `8b33b246` — feat(game-detail): show Other Players section with status dot indicators
- `ac47713d` — feat(whats-new): add 2026-06-21 entries for follow requests and other players
