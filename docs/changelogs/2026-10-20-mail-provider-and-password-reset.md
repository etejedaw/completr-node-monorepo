# Provider de correo y recuperación de contraseña

**Released:** 2026-10-20

## Summary

La API empieza a enviar correo transaccional por su cuenta, sin un servicio aparte: el token de reset lo genera, guarda e invalida la propia API, y el correo es parte de esa misma operación. El envío vive en un provider nuevo, `apps/api/src/mail/`, con `nodemailer` sobre SMTP y el mismo patrón de providers opcionales que RAWG: sin `SMTP_HOST` queda deshabilitado y responde 503. Sobre esa base se agrega la recuperación de contraseña, con token de un solo uso guardado como hash, respuesta que no revela si un email está registrado y cierre de todas las sesiones al cambiar la contraseña.

## Highlights

- `POST /auth/forgot-password` y `POST /auth/reset-password`, con páginas `/forgot-password` y `/reset-password` en la web y el link "Forgot password?" en `/login`.
- Provider `mail` con plantilla HTML de la marca (`branded-email.template.ts`) y versión en texto plano.
- Mailpit en el `docker-compose.yml` de desarrollo para ver los correos enviados.

## Added

- `apps/api/src/mail/`: `MailClient` con `SmtpMailProvider` y `DisabledMailProvider`, errores `MAIL_DISABLED` (503) y `MAIL_SEND_ERROR` (502) registrados en los normalizers globales, y `renderBrandedEmail` para armar correos con logo, encabezado, botón de acción, notas y pie.
- `apps/api/src/common/config/mail.config.ts`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` y `MAIL_FROM`, todas opcionales.
- `environment.config.ts`: `PASSWORD_RESET_TOKEN_TTL_MINUTES` (default 60) y `WEB_APP_URL` para armar los links de los correos.
- Tabla `PasswordResetTokens` (`userId`, `tokenHash` único, `expiresAt`) con FK a `Users` y `ON DELETE CASCADE`.
- `auth/services/password-reset.service.ts`: crea el token (borrando los anteriores del usuario) y lo reclama de forma atómica al usarlo.
- `common/utils/one-time-token.util.ts`: token de 32 bytes en hex y su hash SHA-256.
- `POST /auth/forgot-password`: responde siempre 204 y envía en segundo plano, solo a cuentas activas. Nuevo `passwordResetLimiter` (3 cada 15 minutos).
- `POST /auth/reset-password`: valida el token, cambia la contraseña y revoca todos los refresh tokens. Error `AUTH_INVALID_PASSWORD_RESET_TOKEN` (400).
- Web: `/forgot-password` (estado de enviado con "try another email") y `/reset-password` (checklist de reglas, estado de link inválido o vencido y estado final con botón a Sign in). `tokenQueryGuard` redirige a `/login` si falta el token.
- Mailpit en `apps/api/docker-compose.yml` (`MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT`).

## Changed

- Web: `AuthPage` reúne el layout de login (showcase, encabezado y pie) y lo usan login, forgot y reset. `PasswordRules` saca a un componente el checklist de contraseña de Settings → Security.
- `docs/invariants.md`, `docs/context/providers.md` y `README.md` documentan el flujo, los límites, el provider y la configuración local de SMTP.

## Migration

- Aplicar `20261020024705-create-password-reset-tokens.js`.
- Para enviar correos, definir `SMTP_HOST` y el resto de credenciales SMTP, y `WEB_APP_URL` con la URL pública de la web. En local basta con `SMTP_HOST=localhost` y `SMTP_PORT=1025` contra Mailpit.

## Files of interest

- `apps/api/src/mail/mail.provider.ts`
- `apps/api/src/mail/branded-email.template.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/services/password-reset.service.ts`
- `apps/web/src/app/features/auth/auth-page/auth-page.ts`
- `apps/web/src/app/features/auth/reset-password/reset-password.ts`

## Commits

- `790a1e96` — build(api): add nodemailer dependency
- `bc50f6e8` — feat(mail): add smtp mail provider with branded email template
- `268cfb0f` — chore(api): add mailpit to local compose and mail env vars
- `ac165a3e` — feat(auth): add password reset tokens table
- `0e5890eb` — feat(auth): add forgot and reset password endpoints
- `5acb3006` — docs(api): document password reset endpoints and mail provider
- `718a2b03` — refactor(web): extract auth page layout and password rules checklist
- `3239feb2` — feat(web): add forgot and reset password pages
