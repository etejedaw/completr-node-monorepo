# Bloqueo de HTML en name y bio (XSS almacenado)

**Released:** 2026-07-05

## Summary

Cierre del hallazgo de severidad alta de la re-auditoría de seguridad del 2026-06-26: los campos `name` y `bio` aceptaban HTML/JS arbitrario (`<script>`, `<img onerror=...>`) y lo persistían crudo. Hoy no era explotable porque Angular escapa con text binding, pero cualquier cliente futuro que renderice sin escapar (panel admin, móvil, `[innerHTML]`) quedaba expuesto. La validación se aplica en la frontera del API con un schema Zod compartido (`SafeTextSchema`, regex `/^[^<>]*$/`) para que la regla proteja a todos los clientes por igual. Payloads con `<` o `>` devuelven 422 `COMMON_SCHEMA_INVALID`.

Durante la implementación se detectó que el hueco no era solo `PATCH /users/me` (lo único que probó la auditoría): `POST /auth/register` (y por reuso de schema, `POST /admin/users`) y `PATCH /admin/users/:userId` aceptaban lo mismo. Se cerraron las tres puertas.

## Highlights

- `SafeTextSchema` compartido en `common/schemas`, reusable para cualquier campo de texto libre futuro.
- Aplicado a `name` y `bio` en `update-user`, `register` y `admin-update-user`.
- Verificado con payloads XSS reales: `<script>`, `<img src=x onerror=...>` y `<b>` rechazados con 422; texto legítimo pasa.

## Added

- `src/common/schemas/safe-text.schema.ts` — `SafeTextSchema` (string sin `<` ni `>`).
- `docs/api/users/admin-update.yml` — doc Bruno de `PATCH /admin/users/:userId`, que no existía.

## Changed

- `UpdateUserSchema`, `RegisterSchema` y `AdminUpdateUserSchema` basan `name`/`bio` en `SafeTextSchema`.
- Docs Bruno de `update-me`, `register` y `admin-create` documentan la restricción.

## Notas / pendiente

- Datos ya persistidos: queda por correr en producción `SELECT id, username, name, bio FROM users WHERE name ~ '[<>]' OR bio ~ '[<>]'` y sanear si hay filas.

## Files of interest

- `src/common/schemas/safe-text.schema.ts`
- `src/users/schemas/update-user.schema.ts`
- `src/auth/schemas/register.schema.ts`
- `src/users/schemas/admin-update-user.schema.ts`

## Commits

- `4fd475d` — fix(security): reject html in name and bio fields
- `7097275` — docs(api): document html restriction on name and bio
- `f558a9f` — docs(api): add admin update user endpoint doc
