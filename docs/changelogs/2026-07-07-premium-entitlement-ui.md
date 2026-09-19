# Distintivo premium en el frontend

**Released:** 2026-07-07

## Summary

El frontend expone si el usuario tiene premium y marca las funciones reservadas a premium. El entitlement sale del usuario autenticado; qué funciones son premium y los límites de cada plan son planificación de producto y no se documentan acá.

## Added

- Signal de entitlement en el servicio de auth.
- Componente `ui-premium-badge` y directiva `premium-only`.
- Distintivo premium en las funciones con gating (vistas guardadas, favoritos, entre otras).

## Files of interest

- `apps/web/src/app/shared/directives/premium-only.ts`
- `apps/web/src/app/shared/ui/premium-badge/ui-premium-badge.ts`

## Commits

- `91b099ff` — feat(premium): add entitlement signal, badge and premium-only directive
- `fc30d93e` — feat(premium): show premium distinctive on gated features
