# Páginas de seguidores y seguidos

**Released:** 2026-10-12

## Summary

Los seguidores y seguidos de un perfil pasan de un modal a páginas propias (`user-connections`), con tarjetas de usuario que reutilizan las acciones de seguir. La API expone los campos de tarjeta de usuario en `user-followers` y en las búsquedas, y las listas respetan la visibilidad del perfil.

## Added

- Página `user-connections` con rutas de seguidores y seguidos en `app.routes.ts`.
- Helper compartido `follow-actions` (`features/users-discover/`), extraído de `users-discover`.
- Campos de tarjeta de usuario en `GET` de seguidores, seguidos, `discover` y `search` (módulos `user-followers` y `users`), con su documentación en `docs/api/`.

## Changed

- El hero del perfil enlaza a las páginas de seguidores y seguidos.

## Removed

- El componente `user-list-modal`.

## Fixed

- Las listas de seguidores y seguidos ahora respetan la visibilidad del perfil mediante `users-profile.service`.

## Files of interest

- `apps/web/src/app/features/public-profile/user-connections/user-connections.ts` — página de conexiones.
- `apps/api/src/user-followers/user-followers.controller.ts` — endpoints y control de visibilidad.
- `apps/api/src/users/users-profile.service.ts` — verificación de acceso al perfil.

## Commits

- `cd39f163` — feat(api): expose user card fields in followers, following and search
- `9eec9689` — refactor(web): extract follow actions into shared helper
- `66e07402` — feat(web): add followers and following pages
- `8aa41c4e` — fix(api): gate followers and following lists by profile visibility
