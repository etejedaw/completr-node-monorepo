# Solicitudes de datos personales: copia y borrado de cuenta

**Released:** 2026-11-05

## Summary

Completr implementa los derechos de acceso, portabilidad y supresión de la Ley 21.719 de Chile. El usuario pide desde Settings → Your data una copia de sus datos o el borrado de su cuenta, y el admin resuelve cada solicitud desde Admin → Users dentro del plazo legal de 30 días corridos. La copia es un JSON con todo lo que la API guarda del usuario y un bloque `meta` con la información que exige el derecho de acceso (finalidades, destinatarios, conservación y origen). Se genera en el momento de la descarga y no depende del plan del usuario. Hasta ahora la única baja era la desactivación (`isActive = false`) y 14 FK a `Users` no tenían `ON DELETE`, así que un borrado físico fallaba con `23503`. Esas FK pasan a `ON DELETE CASCADE` y el borrado completo corre en una sola transacción. Las solicitudes quedan registradas en `DataRequests` como prueba de la respuesta, y al borrar la cuenta se conservan sin datos personales.

## Highlights

- Settings → Your data: pedir una copia o el borrado, seguir su estado y descargar la copia durante 7 días.
- Cola de solicitudes en Admin → Users, con los días que quedan del plazo y las acciones completar y rechazar con motivo.
- Descarga de datos y borrado de cuenta directos desde la fila de cada usuario en Admin → Users.
- Correos al admin cuando llega una solicitud y al usuario cuando se resuelve.

## Added

- Tabla `DataRequests` (`20261105151649-create-data-requests-table.js`): `type` (`enum_DataRequests_type`: `export`, `deletion`), `status` (`enum_DataRequests_status`: `pending`, `completed`, `rejected`), `resolutionNote`, `requestedAt`, `resolvedAt`, `userId` y `resolvedById` con `ON DELETE SET NULL`. Un índice único parcial sobre `("userId", type) WHERE status = 'pending'` impide dos solicitudes pendientes del mismo tipo.
- Módulo `data-requests`: `POST` y `GET /users/me/data-requests`, `GET /users/me/data-requests/:requestId/download`, `GET /admin/data-requests` y `POST /admin/data-requests/:requestId/complete` y `/reject`. Errores `DATA_REQUEST_ALREADY_PENDING`, `DATA_REQUEST_NOT_FOUND`, `DATA_REQUEST_NOT_DOWNLOADABLE`, `DATA_REQUEST_EXPIRED` y `DATA_REQUEST_NOT_PENDING`. El serializer calcula `dueAt`, `daysRemaining` y `downloadableUntil`.
- `personal-data-export.service.ts`: arma el export a partir de un `find*ForDataExport` por módulo (backlog, queue, estantería, wishlist, favoritos, listas, listas seguidas, vistas guardadas, reseñas, seguidores, solicitudes de seguimiento, actividad, mood tags, sagas, platinos, Rewinds, accesos premium, sesiones, reportes y solicitudes), sin hash de contraseña ni tokens.
- `users-deletion.service.ts`: borra en una transacción las actividades de otros usuarios que lo tienen como objetivo, la invitación de su email y el usuario; el resto cae por cascada. Rechaza cuentas admin y al propio admin con `USER_DELETE_FORBIDDEN`. Después limpia sus imágenes del Rewind y registra `user_deleted` en `AuditLogs`.
- `DELETE /admin/users/:userId` y `GET /admin/users/:userId/data-export`, que registra `user_data_exported`.
- `clearRewindImagesOf(username)` y `LruCache.deleteKeysStartingWith()` en `rewind-share`, para vaciar solo las imágenes de un usuario.
- `DATA_REQUESTS_NOTIFY_EMAIL` en `mail.config.ts` (por defecto `completr@etejeda.dev`).
- Web: sección `settings-data`, panel `admin-data-requests` embebido en `admin-users`, diálogos `admin-account-deletion-dialog` (confirmación escribiendo el username) y `admin-data-request-reject-dialog`, acciones por fila en `admin-user-data-actions.ts`, servicios `data-requests` y `data-request-admin.service.ts`, y `DATA_REQUEST_ERROR_MESSAGES` dentro de `ADMIN_ERROR_MESSAGES`.

## Changed

- `20261105151647-change-user-fks-to-cascade.js`: las FK a `Users` de `Backlogs`, `Queues`, `GameShelves`, `Wishlists`, `Favorites`, `Lists`, `ListFollowers`, `SavedFilters`, `GameReports`, `Reviews`, `UserFollowers` (`followerId` y `followingId`), `Activities` y `ActivityUsers.targetUserId` pasan a `ON DELETE CASCADE`, igual que su `onDelete` en `associations.database.ts`. `AuditLogs.userId` no cambia.
- `ExportService` del web separa `downloadAttachment(url, fallbackName)`, que reutilizan los exports de colecciones y las descargas nuevas. `isToastedByErrorInterceptor` evita toasts duplicados.
- Política de privacidad 2.4: la copia y el borrado se piden desde Settings → Your data o por correo, con el plazo de 30 días y la copia en JSON.
- `docs/architecture.md`: el soft delete deja de ser la única baja; el admin puede borrar en duro.

## Fixed

- Las expectativas de los tests de integración de IGDB pasan a la nota redondeada a entero, que había quedado pendiente del cambio del extractor.

## Migration

- Aplicar `20261105151647-change-user-fks-to-cascade.js` y `20261105151649-create-data-requests-table.js`.

## Files of interest

- `apps/api/src/data-requests/services/data-request-resolution.service.ts`
- `apps/api/src/data-requests/services/personal-data-export.service.ts`
- `apps/api/src/users/users-deletion.service.ts`
- `apps/api/migrations/20261105151647-change-user-fks-to-cascade.js`
- `apps/web/src/app/features/settings/settings-data/settings-data.ts`
- `apps/web/src/app/features/admin/admin-data-requests/admin-data-requests.ts`

## Commits

- `1a2b759f` — test(games): expect the igdb rating rounded to an integer
- `4903dc1c` — feat(api): cascade user foreign keys on account deletion
- `dd703965` — feat(data-requests): add data requests table and model
- `dd076d02` — feat(api): expose per-module finders for the personal data export
- `9618056b` — feat(rewind-share): evict the cached images of a single user
- `5e8aed8b` — feat(users): add full account deletion service
- `fb39d2ca` — feat(data-requests): add personal data export and deletion requests
- `ff585ec7` — feat(users): add admin account deletion and data export endpoints
- `a2887723` — test(data-requests): cover requests, personal data export and account deletion
- `3e97d61d` — docs(api): document data requests and admin account deletion endpoints
- `6c8159ec` — docs(api): document data requests, export and account deletion rules
- `ed149ab4` — refactor(web): extract generic attachment download from export service
- `266fd9ca` — feat(web): add data request model, service and error messages
- `b17ba9e4` — feat(web): add your data settings section for data requests
- `156cbd44` — feat(web): add admin data requests queue with complete and reject
- `e5924593` — feat(web): add download data and delete account actions to admin users
- `df3c6a3b` — docs(web): document data requests views and attachment downloads
- `1bb9f695` — docs(landing): update privacy policy for data export and account deletion requests
