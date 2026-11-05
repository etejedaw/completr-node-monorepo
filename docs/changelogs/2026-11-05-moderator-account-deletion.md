# Borrado de cuentas de moderador

**Released:** 2026-11-05

## Summary

El borrado de cuenta de `DELETE /admin/users/:userId` fallaba con 409 `USER_DELETE_FORBIDDEN` para cualquier cuenta con auditoría propia, porque `AuditLogs.userId` no tenía `ON DELETE`. Los moderadores dejan auditoría al editar juegos, resolver reportes o refrescar datos externos, así que no se podían borrar. La FK pasa a `ON DELETE SET NULL`: la auditoría se conserva sin autor y la vista de Admin → Audit Log la muestra como "Deleted user". Las cuentas `admin` siguen sin poder borrarse. De paso se corrige el doble borrado simultáneo de una misma cuenta.

## Changed

- Migración `20261105202249-change-auditlogs-userid-to-set-null.js`: `AuditLogs.userId` acepta `NULL` y su FK a `Users` pasa a `ON DELETE SET NULL`. El `down` vuelve a `NO ACTION` y solo restaura `NOT NULL` si no quedan entradas sin autor.
- `AuditLog` (`audit/audit.model.ts`) declara `userId` nullable, y `associations.database.ts` agrega `User.hasMany(AuditLog, { onDelete: "SET NULL" })`.
- `GET /admin/audit` devuelve `user: null` para las entradas de una cuenta borrada (el controller ya lo contemplaba).
- `AdminAudit` (`features/admin/admin-audit`) muestra "Deleted user" en cursiva y atenuado, en la tabla de escritorio y en las tarjetas de mobile, en lugar de "Unknown".
- `docs/invariants.md` documenta el `SET NULL` de `AuditLogs.userId` y corrige la afirmación de que solo los admins dejan auditoría.

## Fixed

- Dos `DELETE /admin/users/:userId` simultáneos sobre la misma cuenta respondían 204 los dos y registraban `user_deleted` dos veces. `deleteAccount()` (`users/users-deletion.service.ts`) lanza `notFoundError` si `destroyUser` no borró ninguna fila, así que el segundo responde 404 `USER_NOT_FOUND`, se revierte su transacción y queda una sola auditoría.

## Files of interest

- `apps/api/migrations/20261105202249-change-auditlogs-userid-to-set-null.js`
- `apps/api/src/users/users-deletion.service.ts`
- `apps/api/test/data-requests/personal-data.integration.test.ts`
- `apps/web/src/app/features/admin/admin-audit/admin-audit.html`

## Commits

- `024d9fb5` — feat(audit): keep audit history without author when a user is deleted
- `68851cbc` — fix(users): answer 404 when a concurrent request already deleted the account
- `0af77daf` — feat(web): label audit entries of deleted authors as deleted user
- `7e1dae4e` — docs(api): document audit history of deleted moderators
