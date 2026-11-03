# Privacidad por run

**Released:** 2026-11-03

## Summary

La API ya guardaba si una run es pública (`Backlog.isPublic`, `true` por defecto) y la aceptaba al crear y al editar, pero la interfaz no permitía cambiarla. El modal de la run suma un switch para eso, y las runs privadas muestran un candado junto al título en My Games.

## Added

- Switch "Public run" en `backlog-modal`, al crear y al editar. Arranca en el valor de la run (público al crear) y se envía como `isPublic` en el `POST` y el `PATCH`. Las filas de switches del modal llevan un ícono a la izquierda: Up Next, My Shelf y un globo o un candado según la privacidad.
- `PrivateRunLock` (`shared/components/private-run-lock`): candado con nombre accesible "Private run: only you can see it". Aparece junto al título en `BacklogTable` y en `BacklogEntryCard` cuando la run es privada y la vista no es `readonly`.

## Files of interest

- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.html`
- `apps/web/src/app/shared/components/private-run-lock/private-run-lock.ts`

## Commits

- `2ef23b4a` — feat(backlog): add run privacy switch to backlog modal
- `4a722de0` — feat(backlog): show a lock next to private runs
