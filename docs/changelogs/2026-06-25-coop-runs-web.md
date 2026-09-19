# Runs en co-op (frontend)

**Released:** 2026-06-25

## Summary

Complemento de frontend de `2026-06-25-coop-runs.md`. El modal del backlog suma una sección "Played with" para etiquetar compañeros, con diálogos de selección y de sincronización; las filas muestran los avatares del co-op.

## Added

- Servicio `coop-runs` y sección "Played with" en `backlog-modal`, con diálogos de picker y sync.
- Pila de avatares de co-op en las filas del backlog.
- Etiqueta de `coop_tagged` en el feed.
- Entrada de What's New para co-op runs y notas de progreso.

## Files of interest

- `apps/web/src/app/features/coop-runs/coop-runs.ts`
- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.ts`

## Commits

- `721812f0` — feat(coop-runs): add service and played-with section with sync and picker dialogs
- `ccdc690d` — feat(backlog): show coop avatars stack in rows
- `0a369fa2` — docs(whats-new): announce co-op runs and progress notes
- `854a6e47` — feat(activity): label coop_tagged in feed
