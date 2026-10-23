# Enlaces sin token y validación del registro

**Released:** 2026-10-22

## Summary

Las pantallas de auth dejan de depender solo de la API para rechazar entradas que ya se saben inválidas. Reset de contraseña y aceptar invitación reconocen un enlace sin token, y el registro valida con la misma política de contraseña que la API.

## Changed

- `register`: valida username, name, email y contraseña con `core/utils/account-fields` y `core/utils/password-policy`, muestra un mensaje por campo y las reglas de contraseña en vivo con `PasswordRules`, igual que accept-invite. El botón ya no se deshabilita: al enviar, marca los campos con error.

## Fixed

- `reset-password`: sin `?token=` o con el token vacío muestra el estado de enlace inválido y no envía nada.
- `accept-invite`: sin token muestra el estado de invitación inválida sin pedir `GET /invitations/`.

## Files of interest

- `apps/web/src/app/features/auth/register/register.ts`
- `apps/web/src/app/features/auth/reset-password/reset-password.ts`
- `apps/web/src/app/features/auth/accept-invite/accept-invite.ts`

## Commits

- `f0386c1c` — fix(web): show invalid link page when reset password link has no token
- `18e73b4a` — fix(web): skip invitation lookup and show invalid page when link has no token
- `7a0c372b` — feat(web): validate register password and fields with shared policy and per-field messages
