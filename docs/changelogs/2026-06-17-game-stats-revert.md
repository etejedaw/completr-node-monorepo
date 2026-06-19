# Revert del endpoint de stats de juego

**Released:** 2026-06-17

## Summary

Revierte el endpoint `GET /games/:id/stats` y el panel de "Runs" en la ficha del juego (FB-015) tras decisión del producto: mostrar counts agregados de backlog en la ficha no aporta el valor esperado. Quita el endpoint, el controller, el método `backlogService.countBacklogByStatusForGame`, la documentación Bruno asociada y la sección en el frontend. La infraestructura podrá reabrirse cuando aterricen FB-021 / FB-022 (drill-down de amigos y users random en la ficha), donde el conteo agregado sí es input necesario.

## Highlights

- `GET /games/:id/stats` eliminado.
- `countBacklogByStatusForGame` removido del `backlog.service`.
- FB-015 marcado como `descartado` en `docs/feedback/fase-3.md`.

## Removed

- **Endpoint:** `GET /games/:id/stats` — ruta, controller `gamesController.getGameStats` y servicio `backlogService.countBacklogByStatusForGame`.
- **Documentación Bruno:** `docs/api/games/stats.yml`.

## Files of interest

- `src/games/games.routes.ts`, `src/games/games.controller.ts`
- `src/backlog/backlog.service.ts`
- `docs/feedback/fase-3.md`

## Commits

- `f29bfef` — revert(games): drop stats endpoint and run counts
- `3cb9569` — docs(feedback): mark FB-015 as descartado
