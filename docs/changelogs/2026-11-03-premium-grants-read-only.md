# Concesiones premium vencidas de solo lectura

**Released:** 2026-11-03

## Summary

Revocar una concesión es poner su vencimiento en el momento actual, así que una revocada y una vencida son indistinguibles. Admin → Users → Premium access mostraba "Save date" y "Revoke" en todas: revocar una vencida movía su fecha real hacia adelante y cambiar la fecha de una vencida la reactivaba. Ahora una concesión que no está activa es historial de solo lectura; para volver a dar acceso se crea una nueva.

## Added

- Error de dominio `PREMIUM_GRANT_NOT_ACTIVE` → HTTP 409 en `premium-access`, con su service error y su mapper.
- `revokePremiumGrant` y `updatePremiumGrantExpiration` lo lanzan si la concesión tiene vencimiento y ya pasó, sin tocar la fecha. Una concesión sin vencimiento sigue revocable.

## Changed

- Web: las concesiones inactivas no muestran el input de fecha, "Save date" ni "Revoke" y dicen "Expired on <fecha>". Un 409 `PREMIUM_GRANT_NOT_ACTIVE` (otra pestaña la revocó) recarga la lista con un aviso.
- `docs/invariants.md` y la colección Bruno (`Revoke Premium Grant`, `Update Premium Grant`) documentan el 409.

## Files of interest

- `apps/api/src/premium-access/premium-grants-admin.service.ts`
- `apps/api/test/premium-access/premium-access-admin.integration.test.ts`
- `apps/web/src/app/features/admin/admin-premium-access/admin-premium-access.html`

## Commits

- `6b66250b` — feat(premium-access): reject revoking or changing grants that are no longer active
- `3d7172f2` — docs(premium-access): document the PREMIUM_GRANT_NOT_ACTIVE conflict
- `bb4d92e1` — feat(admin): show inactive premium grants as read-only history and reload on a not active conflict
