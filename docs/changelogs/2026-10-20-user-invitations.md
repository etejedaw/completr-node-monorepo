# Invitaciones de usuario por email

**Released:** 2026-10-20

## Summary

Un admin puede dar de alta a alguien con solo su email: la API crea una invitación, envía un correo con un link de un solo uso y la persona elige su username, nombre y contraseña. Se agrega como módulo propio, `invitations`, sobre el provider `mail` y el mismo esquema de token que la recuperación de contraseña. La invitación no crea un usuario a medias: la cuenta recién existe al aceptar, así que `Users` no cambia. El alta manual desde `/admin/users` se mantiene.

## Highlights

- `POST /admin/invitations`, `GET /admin/invitations` y `DELETE /admin/invitations/:invitationId` para el admin.
- `GET /invitations/:token` y `POST /invitations/accept`, públicos: aceptar crea la cuenta e inicia sesión.
- Sección "Pending invitations" en `/admin/users` y página `/accept-invite` en la web.

## Added

- Módulo `apps/api/src/invitations/` con modelo, service, controller, rutas, serializer, schemas, DTOs y errores (`INVITATION_NOT_FOUND`, `INVITATION_INVALID_TOKEN`, `INVITATION_EMAIL_REGISTERED`, entre otros), registrados en los normalizers globales.
- Tabla `UserInvitations` (`email` único, `tokenHash` único, `invitedById` con FK a `Users` y `ON DELETE SET NULL`, `expiresAt`).
- `environment.config.ts`: `USER_INVITATION_TTL_DAYS` (default 7).
- Invitar un email con invitación pendiente la reemplaza, y así funciona el reenvío. Si el correo no se puede enviar, la invitación se descarta.
- `usersService.isEmailRegistered`: cuenta también usuarios inactivos, para responder 409 a un email ya registrado.
- Auditoría: acciones `user_invited` e `invitation_revoked` sobre el tipo `invitation`, también en los filtros de `/admin/audit`.
- Web: `AdminInvitations` (lista con Resend y Revoke con confirmación, modal "Invite by email") e `InvitationAdminService`.
- Web: `/accept-invite` con esqueleto de carga, email fijo, username, nombre y contraseña con `PasswordRules`, y estado de invitación inválida. Usa `tokenQueryGuard` y `AuthPage`.

## Changed

- `UsernameSchema`, `DisplayNameSchema` y `OneTimeTokenSchema` salen a archivos propios y los comparten registro, reset e invitaciones. `getDeviceInfo` pasa a `auth/utils/device-info.util.ts`.
- `smtpSettings` en `mail.config.ts` reúne la configuración que reciben los consumidores de `MailClient.create`.
- Web: `core/utils/account-fields.ts` reúne las reglas y mensajes de username y nombre que usaban `admin-users` y ahora también `accept-invite`.
- `docs/invariants.md` documenta las reglas de invitación y los limiters, y `docs/api/invitations/` los cinco endpoints.

## Migration

- Aplicar `20261020032710-create-user-invitations.js`.
- Requiere el provider `mail` configurado (ver `2026-10-20-mail-provider-and-password-reset.md`); sin `SMTP_HOST`, invitar responde 503.

## Files of interest

- `apps/api/src/invitations/invitations.service.ts`
- `apps/api/src/invitations/invitations.controller.ts`
- `apps/web/src/app/features/admin/admin-invitations/admin-invitations.ts`
- `apps/web/src/app/features/auth/accept-invite/accept-invite.ts`

## Commits

- `ff6b21bf` — refactor(api): share smtp settings, one-time token and account field schemas
- `8bb0e1ca` — feat(invitations): add user invitations table
- `f630a219` — feat(invitations): add admin invitation and accept endpoints
- `482a1687` — docs(api): document invitation endpoints
- `7ec99f58` — feat(web): add pending invitations panel to admin users
- `a1765b1a` — feat(web): add accept invitation page
