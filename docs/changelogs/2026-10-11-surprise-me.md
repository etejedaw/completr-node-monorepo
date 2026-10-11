# Surprise me: juego al azar del backlog

**Released:** 2026-10-11

## Summary

My Games suma un botón "Surprise me" que elige un juego al azar del backlog para ayudar a decidir qué jugar. Sortea dentro de los filtros activos (vista guardada, plataforma, género, mood tags, búsqueda, rangos) y, si no hay filtro de estado, solo entre los Not started. Es solo frontend: usa `GET /users/me/backlog` con `limit=1` y un `offset` al azar entre 0 y el `total` del filtro, con orden estable por `createdAt`.

## Added

- Componente `SurpriseMe` (`features/backlog/surprise-me/`): modal con portada, título, plataforma, duración, ratio, mood tags y cantidad de candidatos. Acciones "Spin again" (nunca repite el juego anterior), "Add to Up Next" (muestra "In Up Next" si ya está y el error inline si falla) y "Open game". Se cierra con Escape o con la X y usa `uiFocusTrap`, `role="dialog"` y `aria-modal`.
- Botón "Surprise me" en el encabezado de `backlog-list`, que abre el modal con los filtros base de la lista.

## Files of interest

- `apps/web/src/app/features/backlog/surprise-me/surprise-me.ts` — conteo de candidatos, offset al azar y alta en Up Next.
- `apps/web/src/app/features/backlog/backlog-list/backlog-list.html` — botón y montaje del modal.

## Commits

- `aec5c180` — feat(backlog): add surprise me random pick
