# Estado endless (frontend)

**Released:** 2026-06-17

## Summary

Complemento de frontend de `2026-06-17-endless-backlog-status.md`. El frontend suma `endless` al tipo de estado del backlog y lo trata como un estado finalizado: admite rating, review y las mismas transiciones.

## Added

- `endless` en el tipo de estado del backlog y en las etiquetas de actividad.
- Opción `endless` en `backlog-list` y `backlog-modal`, con rating, review y transiciones.
- Render de `endless` en `game-detail`, `list-detail` y el backlog del perfil público.

## Files of interest

- `apps/web/src/app/core/models/backlog.model.ts`
- `apps/web/src/app/shared/utils/activity-labels.ts`

## Commits

- `71a7177c` — feat(core): add endless to backlog status type and activity labels
- `051b35d7` — feat(backlog): expose endless status with rating, review and updated transitions
- `2724d917` — feat(views): render endless status in game-detail, list-detail and public profile
