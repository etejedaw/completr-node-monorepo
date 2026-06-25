# Backlog progress notes

**Released:** 2026-06-25

## Summary

Nuevo módulo `backlog-progress` que permite registrar un timeline de notas cortas por run del backlog ("Capítulo 3, stuck en el puzzle del agua"). El append-only model evita pisar el estado anterior y permite revisar la evolución del progreso cuando el usuario vuelve al juego después de meses. La nota más reciente se expone en el serializer del backlog como `latestProgress` (solo en self-view) para que el frontend pueda mostrar un chip en la fila sin cargar todo el timeline.

## Highlights

- Modelo `BacklogProgress(backlogId, note, createdAt)` con `note` máx 500 chars e índice `(backlogId, createdAt DESC)` para queries de timeline rápidas.
- Migración defensiva que restaura el PRIMARY KEY de `Backlogs` si faltara (caso detectado en dev por un `sync()` viejo) antes de crear la FK con CASCADE.
- 3 endpoints: `POST` append, `GET` timeline, `DELETE` entry.
- `backlogSerializer` extendido con `latestProgress`, batch-loaded vía `findLatestProgressForBacklogs(backlogIds)` (un solo query para todo el page).
- `backlogPublicSerializer` excluye `latestProgress` (notas son personales, no se exponen en perfiles públicos).

## Added

- Migración `20260625160000-create-backlog-progress.js` con backfill de PK defensivo.
- Módulo `src/backlog-progress/` (model, service, controller, routes, schemas, errors).
- 3 endpoints documentados en `docs/api/backlog-progress/`.

## Changed

- `backlogSerializer` y `backlogPublicSerializer` aceptan `latestProgress?: { note, createdAt }`.
- `getMeBacklog` y `getUserBacklog` (cuando isSelf) cargan latestProgress en batch antes de serializar.

## Files of interest

- `src/backlog-progress/backlog-progress.service.ts`
- `src/backlog-progress/backlog-progress.controller.ts`
- `src/backlog/backlog.serializer.ts`
- `migrations/20260625160000-create-backlog-progress.js`

## Commits

- `8e41db0` — feat(backlog-progress): add module with timeline endpoints for progress notes
- `625a1c8` — feat(backlog): include latestProgress in serializer for self-view
- `99b2e70` — docs(api): document backlog-progress endpoints and latestProgress field
