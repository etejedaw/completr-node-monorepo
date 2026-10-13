# Corrección de visibilidad por sección del perfil

**Released:** 2026-10-13

## Summary

Las ocho columnas de visibilidad de `user.model.ts` compartían un mismo objeto de atributo, por lo que Sequelize les asignaba el mismo `field` y todas leían `profileVisibility`. Ahora `visibilityField()` crea un objeto por columna. En paralelo, el perfil público expone `access` por sección y la web lo usa en lugar de calcularlo localmente.

## Fixed

- Cada columna de visibilidad de `user.model.ts` tiene su propio `field`; antes todas leían `profileVisibility`.

## Added

- Acceso por sección (`access`) en la respuesta del perfil público (`visibility.helper`, `users-profile.service`, `users.serializer`), documentado en `docs/api/users/get-by-username.yml`.

## Changed

- `public-profile` lee el acceso por sección desde la API a través de `public-profile.service`.

## Files of interest

- `apps/api/src/users/user.model.ts` — `visibilityField()`.
- `apps/api/src/users/helpers/visibility.helper.ts` — cálculo del acceso por sección.
- `apps/web/src/app/features/public-profile/public-profile.ts` — consumo del acceso.

## Commits

- `c71c13b4` — feat(users): expose section access in public profile
- `e448334e` — fix(users): create visibility attribute per field
- `fe4f1cee` — refactor(web): read section access from public profile API
