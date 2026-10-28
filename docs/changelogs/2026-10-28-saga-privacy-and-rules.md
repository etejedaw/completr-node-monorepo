# Privacidad de sagas y sagas con juegos

**Released:** 2026-10-28

## Summary

Las sagas que sigue un usuario se mostraban en su perfil según la visibilidad del backlog, que venía de cuando la sección mostraba progreso. Ahora tienen su propia sección de privacidad, `franchiseVisibility`, para que cada usuario decida quién ve las sagas que sigue sin tocar su backlog. La migración copia en cada cuenta existente su `backlogVisibility`, así nadie expone más de lo que exponía. Además, una saga ya no puede quedar sin juegos: crear o editar una saga exige al menos un juego, en la API y en el modal del admin. Y el botón Track del hero de la ficha del juego pasa a usar `injectFranchiseTracking`, así que un fallo ya no es silencioso.

## Highlights

- Opción "Sagas" en Settings › Privacy, grupo Library, que decide quién ve las sagas seguidas en el perfil.
- `GET /users/:username/franchises` depende de `franchiseVisibility` y no del backlog.
- `POST /franchises` y `PATCH /franchises/:id` rechazan una saga sin juegos, y el modal del admin no deja guardarla.
- Track en la ficha del juego: una sola petición por saga y toast si falla.

## Added

- Migración `20261028161332-add-franchisevisibility-to-users.js`: columna `"franchiseVisibility" "enum_Users_visibility" NOT NULL DEFAULT 'public'`, inicializada con `"backlogVisibility"` de cada cuenta.
- Sección `franchise` en `VISIBILITY_SECTIONS` y campo `franchiseVisibility` en el modelo `User`, `UpdateUserSchema`, `USER_CARD_ATTRS` y los serializers. El perfil devuelve `access.franchise`.
- Web: `franchiseVisibility` en los modelos de usuario y perfil, opción "Sagas" en `privacy-options` (título, ícono y color del ítem Sagas del menú) y `visibility().sagas` en `PublicProfile`.
- `missingGames` en `AdminFranchiseModal`: deshabilita Create y Save (con `aria-describedby` al texto "A saga needs at least one game") cuando la selección queda vacía al crear, o al editar si se cambiaron los juegos.

## Changed

- `GET /users/:username/franchises` exige `canView` de `profile` y `franchise` en lugar de `profile` y `backlog`.
- `RegisterFranchiseSchema` exige `gameIds` con 1 a 500 ids y `UpdateFranchiseSchema` acepta `gameIds` opcional pero nunca vacío (422 `COMMON_SCHEMA_INVALID`). Editar solo el nombre sin enviar `gameIds` no cambia.
- `GameDetail` reemplaza su lógica propia de Track por `injectFranchiseTracking`: el estado sale de la saga cargada, una petición a la vez y, ante un 404, recarga la ficha.

## Migration

- Correr `npm run migrate:prod` (y `npm run migrate:dev` en local) para agregar `franchiseVisibility`. Sin la columna, cargar un usuario falla.

## Files of interest

- `apps/api/migrations/20261028161332-add-franchisevisibility-to-users.js`
- `apps/api/src/users/users-profile.service.ts`
- `apps/api/src/franchises/schemas/register-franchise.schema.ts`
- `apps/web/src/app/features/settings/settings-privacy/privacy-options.ts`
- `apps/web/src/app/features/admin/admin-franchise-modal/admin-franchise-modal.ts`
- `apps/web/src/app/features/games/game-detail/game-detail.ts`

## Commits

- `b9219d73` — fix(web): report saga tracking failures from the game detail hero
- `c96f2e80` — feat(api): add franchise visibility section for tracked sagas on profiles
- `d4ace0fa` — feat(api): require at least one game when creating or editing a franchise
- `1fbdb0a1` — docs(api): document franchise visibility and required franchise games
- `a5f6e47e` — feat(web): add sagas privacy section and apply it on the public profile
- `5a5d5ddc` — feat(web): block saving a saga without games in the admin modal
- `7d3df87c` — docs: document franchise visibility and the saga games rule
