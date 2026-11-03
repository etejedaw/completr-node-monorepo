# Privacidad visible en el detalle de la run

**Released:** 2026-11-03

## Summary

El detalle de una run (vista de lectura del modal de My Games) no indicaba si la run era privada, aunque la tabla y las tarjetas ya mostraban el candado. Ahora lo muestra junto al título y en la tarjeta de seguimiento. Además, en las tarjetas del Diary el candado y el trofeo quedan pegados al nombre del juego en lugar de alinearse a la derecha con las acciones.

## Added

- `BacklogEntrySummary` muestra `PrivateRunLock` junto al título cuando la run es privada, y suma la fila "Visibility" en la tarjeta Tracking ("Public" o "Private · only you").

## Changed

- `BacklogEntryCard`: el título, el candado y el trofeo van en un mismo grupo flexible, así los íconos siguen al nombre aunque el título ocupe dos líneas.

## Files of interest

- `apps/web/src/app/features/backlog/backlog-modal/components/backlog-entry-summary.ts`
- `apps/web/src/app/shared/components/backlog-entry-card/backlog-entry-card.html`

## Commits

- `7461ef41` — feat(backlog): show run visibility in the run summary
- `0ea091fc` — style(backlog): keep the lock and trophy next to the card title
