# Notas al abandonar o completar un juego

**Released:** 2026-10-11

## Summary

Al cambiar el estado de un juego desde la lista del backlog, el diálogo de confirmación pedía fecha, duración real, rating y review, pero no notas. Ahora, al pasar a Abandoned o Completed, también muestra el campo Notes del backlog, prellenado con las notas actuales, para dejar registrado por qué se abandonó o qué te pareció.

## Added

- Campo Notes en el diálogo rápido de cambio de estado de `backlog-list`, visible solo para `abandoned` y `completed`. El placeholder cambia según el estado: "Why did you drop it?" o "Your thoughts...".

## Changed

- `confirmStatusChange` incluye `notes` en el PATCH solo si el valor cambió respecto al guardado. Si queda vacío, se envía `null`.

## Files of interest

- `apps/web/src/app/features/backlog/backlog-list/backlog-list.html` — campo Notes del diálogo.
- `apps/web/src/app/features/backlog/backlog-list/backlog-list.ts` — estado del diálogo y payload del PATCH.

## Commits

- `3518bc1f` — feat(backlog): add notes to status change dialog
