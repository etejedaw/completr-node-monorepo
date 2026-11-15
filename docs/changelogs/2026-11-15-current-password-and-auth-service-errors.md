# Contraseña actual al cambiarla y capa de servicio en auth y users

**Released:** 2026-11-15

## Summary

`PATCH /auth/password` exige la contraseña actual, y los services de `auth` y `users` dejan de lanzar errores de dominio: lanzan `ServiceError` como el resto del backend, con las mismas respuestas HTTP que antes. Los services de `users/` pasan a `users/services/` y el gate "perfil visible + sección visible", que seis controllers repetían a mano, queda en un único middleware.

## Highlights

- Con un access token robado ya no se puede cambiar la contraseña de la cuenta.
- El cambio de contraseña y el cierre de las demás sesiones ocurren en una sola transacción, con la fila del usuario bloqueada.
- Una sección nueva del perfil público no puede olvidar una de las dos comprobaciones de visibilidad.

## Added

- `AUTH_INVALID_CURRENT_PASSWORD` (400). Es 400 y no 401 porque la web trata todo 401 como token vencido y refrescaría la sesión.
- `auth/errors/auth.service-error.ts` y `auth.service-to-domain.mapper.ts`; el normalizer de `auth` deja de ser un stub y un código desconocido responde `AUTH_INTERNAL_ERROR`.
- `usersServiceError.privateError` (`USER_PRIVATE`) y `listNotFoundError` (`USER_LIST_NOT_FOUND`, que se traduce al `LIST_NOT_FOUND` de siempre).
- `users/require-visible-profile.middleware.ts`: `requireVisibleProfileMiddleware(section)` deja al dueño en `request.locals.profileOwner`.
- Web: campo "Current password" en Settings → Security. El rechazo se marca en el campo, sin toast, y no deja reenviar el mismo valor rechazado.

## Changed

- `ChangePasswordSchema` pasa a `{ currentPassword, password }`. `auth.service.changePassword(userId, currentPassword, newPassword)` ya no devuelve `true`.
- El reset por token conserva su contrato y ahora guarda la clave y borra las sesiones en una transacción.
- Si la cuenta desaparece entre el middleware y la transacción, el cambio de contraseña responde `AUTH_INVALID_TOKEN` (401) en vez de `USER_NOT_FOUND` (404).
- `users.service`, `users-me.service`, `users-profile.service`, `users-deletion.service` y `user-cards.service` viven en `users/services/`.
- `auth/errors/auth.domains-error.ts` se renombra a `auth.domain-error.ts`.
- Los controllers de `backlog`, `favorites`, `queue`, `game-shelf`, `wishlist` y `game-platinum` leen `profileOwner` en vez de resolver al usuario y su visibilidad.
- `rewind-share.service` captura solo `ServiceError` al buscar el Rewind.
- `docs/rules.md` documenta el gate de visibilidad y la comprobación de la contraseña actual; Bruno: `auth/change-password.yml`.

## Migration

- Quien llame a `PATCH /auth/password` debe enviar `currentPassword`.
- Los imports de `../users/users.service` y afines pasan a `../users/services/...`.

## Files of interest

- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/errors/`
- `apps/api/src/users/require-visible-profile.middleware.ts`
- `apps/api/src/users/users.routes.ts`
- `apps/web/src/app/features/settings/settings-security/`

## Commits

- `658c1916` — feat(users): add private and list not found service errors
- `62f25238` — refactor(users): move services into services folder
- `fa2f399e` — refactor(auth): add service error layer and rename domain error file
- `2b40bf63` — feat(auth): require the current password to change it
- `3fa03137` — refactor(users): extract profile section visibility middleware
- `de52a9d1` — refactor(rewind-share): catch only service errors from the rewind lookup
- `ecfc7c8d` — feat(settings): ask for the current password when changing it
- `fd0bc705` — docs: document the profile visibility gate and the current password check
- `31af6d19` — test(api): align auth unit tests with the current password and auth service error contracts
- `cd8fbd40` — test(rewind-share): stub the service errors the rewind service really throws
