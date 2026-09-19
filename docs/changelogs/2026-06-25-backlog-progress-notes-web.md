# Notas de progreso (frontend)

**Released:** 2026-06-25

## Summary

Complemento de frontend de `2026-06-25-backlog-progress-notes.md`. El modal del backlog suma una línea de tiempo de notas de progreso y se reorganiza en tabs; las runs activas muestran su última nota en la fila.

## Added

- Servicio `backlog-progress` y sección de línea de tiempo en `backlog-modal`.
- Borrador de nota de progreso al crear un backlog.
- Chip con la última nota de progreso en las filas de runs activas.

## Changed

- El formulario de `backlog-modal` se divide en los tabs reference, tracking y notes.

## Files of interest

- `apps/web/src/app/features/backlog-progress/backlog-progress.ts`
- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.html`

## Commits

- `7a896b98` — feat(backlog-progress): add service and progress timeline section in backlog modal
- `cf3c46c8` — feat(backlog): show latest progress chip in rows for active runs
- `c8b237e4` — feat(backlog-progress): allow drafting progress note while creating a backlog
- `b3d89ad9` — refactor(backlog-modal): split form into reference, tracking and notes tabs
