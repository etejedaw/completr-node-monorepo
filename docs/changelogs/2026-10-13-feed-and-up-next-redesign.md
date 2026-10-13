# Rediseño del feed y de Up Next

**Released:** 2026-10-13

## Summary

El feed de actividad se agrupa por día con un ítem propio (`feed-activity-item`) y la vista de Up Next (`features/queue`) se rehace con una tarjeta destacada para el siguiente juego, filas compactas, control de orden y esqueleto de carga. Up Next reutiliza `library-hero` y suma modo de solo lectura para poder mostrarse en perfiles públicos. Es solo frontend.

## Highlights

- Feed agrupado por día con `feed-activity-item`.
- Up Next con `queue-next-card`, `queue-row` y hoja de acciones móvil.
- Orden de la cola con `queue-sort-control` y helpers en `queue-order`.
- Modo de solo lectura en la tarjeta y las filas.

## Added

- Componente `feed-activity-item` y agrupación por día en `feed-page`.
- Componentes `queue-next-card`, `queue-row`, `queue-sort-control` y `queue-skeleton`.
- Helpers de orden en `features/queue/queue-order.ts`.
- Hoja de acciones móvil en `queue-row`.
- Entrada de solo lectura en `queue-next-card` y `queue-row`.

## Changed

- `queue-view` se rehace con los nuevos componentes, usa `library-hero` y ordena con `queue-sort-control`.
- Los toasts pendientes usan una ventana fija de deshacer (`toast.ts` y `toast-container`).
- La tarjeta de siguiente juego adapta su layout en escritorio.

## Removed

- El componente compartido `queue-grid-card`, que quedó sin uso.

## Files of interest

- `apps/web/src/app/features/feed/feed-page.ts` — agrupación del feed por día.
- `apps/web/src/app/features/queue/queue-view/queue-view.ts` — vista de Up Next.
- `apps/web/src/app/features/queue/queue-order.ts` — criterios de orden.
- `apps/web/src/app/features/queue/queue-row/queue-row.ts` — fila y acciones.

## Commits

- `6606770c` — feat(feed): redesign activity feed with day groups
- `c088967b` — feat(queue): redesign queue view with next card and row components
- `1f4a39d2` — style(queue): adapt next card layout for desktop
- `419eaf27` — refactor(queue): remove unused queue grid card
- `93c308c1` — feat(queue): add queue sort order helpers
- `ae58c716` — feat(queue): add sort control component
- `4fd63c1e` — feat(queue): add queue skeleton component
- `a9d23539` — feat(queue): support read-only mode in next card and row
- `930fc068` — feat(queue): sort queue view with sort control
- `bac5a705` — feat(queue): use library hero in queue view
- `c675fe53` — refactor(toast): use fixed undo window for pending toasts
- `bf534e2b` — feat(web): add mobile action sheet to queue rows
