# Privacy controls: follow requests and per-section visibility

**Released:** 2026-06-19

## Summary

Re-arquitectura del modelo de privacidad del perfil. Dos cambios estructurales que se shippean juntos porque interactuan:

1. **Follow requests para perfiles privados.** Cuando un perfil esta en modo `private` y tiene activado `acceptFollowRequests`, los nuevos follows entran como pendientes y el dueno aprueba/rechaza desde un panel propio.
2. **Visibilidad granular por seccion.** Los flags booleanos `isPublic`, `isQueuePublic`, `isWishlistPublic`, `isFavoritePublic`, `isFeedPublic`, `isBacklogPublic`, `isShelfPublic`, `isListPublic` se reemplazan por 8 enums con tres niveles: `private` (solo yo), `friends` (follow mutuo), `public` (todos).

Como efecto secundario, se reparo un drift de schema preexistente en `Users` (la tabla en DB no tenia primary key ni unique constraints porque su `CREATE TABLE` original habia sido skipeado por `IF NOT EXISTS` cuando la tabla ya existia por `sequelize.sync`). Tambien se incorporo un nuevo concepto "friend = mutual follower" que va a ser reutilizado por las proximas senales sociales en la ficha del juego (FB-021/22).

## Highlights

- Perfiles privados con `acceptFollowRequests = true` ahora gatean follows nuevos como `pending` en lugar de aceptarlos automaticamente.
- 4 endpoints nuevos: listar requests recibidas, aceptar, rechazar, cancelar la propia.
- El response de `POST /users/:username/follow` devuelve `{ status: "accepted" | "pending" }` para que el frontend pinte el boton correctamente.
- 8 enums `*Visibility` reemplazan los booleanos `is*Public` con tres niveles cada uno. Backfill `true → public`, `false → private` en la misma migracion.
- Nuevo helper central `canView(viewer, owner, section)` que resuelve self → public → private → friends (con chequeo de follow mutuo).
- `userFollowersService.areMutualFollowers(a, b)` nuevo: un solo query con `Op.or` que cuenta 2 filas.

## Changed

### Follow requests

- Nuevo modulo `src/user-follow-requests/` con model, service, controller, routes y errors propios.
- `POST /users/:username/follow` delega a `userFollowRequestsService.createOrAcceptFollow`. La gating es `target.profileVisibility === "private" && target.acceptFollowRequests`. En `friends` el follow se acepta directo (one-way); solo `private` requiere aprobacion.
- `GET /users/me/follow-requests` lista incoming pendientes con avatar + username + name del requester.
- `POST /users/me/follow-requests/:requesterId/accept` mueve la fila a `UserFollower` y dispara las activities `user_followed` / `user_followed_by` (como si el follow hubiese sido auto-aceptado al momento original).
- `POST /users/me/follow-requests/:requesterId/reject` solo borra la request, sin notificar al requester (mismo patron que Instagram).
- `DELETE /users/me/follow-requests/sent/:username` permite cancelar la request propia antes de que el target responda.
- `PATCH /users/me` acepta `acceptFollowRequests` boolean. Toggle de `true → false` borra todas las pending recibidas en el momento.
- Public profile response (cuando es privado y no es self) ahora incluye `acceptFollowRequests` y `hasPendingRequest` para que el frontend pinte el boton (`Follow` / `Requested` / oculto).

### Per-section visibility

- Migration `20260619160000-add-visibility-enums.js`: crea `enum_Users_visibility (private, friends, public)`, agrega 8 columnas `profileVisibility`, `queueVisibility`, `wishlistVisibility`, `favoriteVisibility`, `feedVisibility`, `backlogVisibility`, `shelfVisibility`, `listVisibility` con default `public`, backfill desde los booleanos viejos y drop de los booleanos en la misma transaccion.
- Nuevo `src/users/visibility.constants.ts` (`VISIBILITY_LEVELS`, `VISIBILITY_SECTIONS`) y `src/users/visibility.helper.ts` con `canView(viewerId, owner, section)`.
- Todos los gates de los controllers (`users`, `backlog`, `queue`, `wishlist`, `favorites`, `game-shelf`) refactorizados a `canView` — el chequeo de "friend" se hace centralmente con `areMutualFollowers`.
- `findFriendsActivityForGame` (la preview de FB-021) ya consume los nuevos enums (`profileVisibility IN ('public', 'friends')`).
- `activity.service.getFeed` mantiene solo owners 100% `public` por simplicidad. Extender a `friends` con chequeo mutuo queda pendiente para cuando se aborde FB-021/22 (mismo patron, mismo subquery).
- Search/discover/admin listings exponen `profileVisibility` en lugar del booleano `isPublic`.

### Frontend

- Nuevo preset **Friends** en `/settings/privacy` (Custom / Private / **Friends** / Open).
- En modo Custom, cada una de las 8 secciones tiene un `<select>` con tres niveles ("Only you" / "Friends" / "Everyone").
- El preset activo se deriva automaticamente: si todos los 8 enums coinciden con un nivel, ese preset queda highlighted; cualquier mix abre Custom.
- `UpdateProfileDto` acepta los 8 enums + `acceptFollowRequests`.
- Tipos `User`, `PublicUser`, `AdminUser` migrados; las gates de los tabs del perfil publico ahora usan `isSelf() || xVisibility !== "private"` para que los followers mutuos sigan viendo la tab cuando el owner la tenga en `friends`.

## Migration notes

- `20260619140000-add-follow-requests.js` agrega `Users.acceptFollowRequests` (default `true`) + crea `UserFollowRequests`.
- `20260619150000-heal-users-schema.js` repara el drift de `Users` (PK, UNIQUE en username/email, NOT NULL, default de id). Idempotente con `IF NOT EXISTS` — en entornos sanos es no-op.
- `20260619150100-add-follow-requests-fks.js` agrega las FK `requesterId/targetId → Users(id) ON DELETE CASCADE` despues del heal.
- `20260619160000-add-visibility-enums.js` agrega los enums y dropea los booleanos viejos en la misma transaccion.

## Files of interest

### Backend (completr-node-backend)

- `src/user-follow-requests/` _(nuevo)_ — modulo completo.
- `src/users/visibility.constants.ts` y `src/users/visibility.helper.ts` _(nuevos)_.
- `src/user-followers/user-followers.service.ts` — agrega `areMutualFollowers`, `createFollow`, `findFollow`.
- `src/users/user.model.ts`, `users.controller.ts`, `users.serializer.ts`, `schemas/update-user.schema.ts` — migrados a enums.
- `src/backlog/backlog.controller.ts`, `src/queue/queue.controller.ts`, `src/wishlist/wishlist.controller.ts`, `src/favorites/favorites.controller.ts`, `src/game-shelf/game-shelf.controller.ts` — usan `canView`.

### Frontend (completr-node-frontend)

- `src/app/features/settings/settings-privacy/` — preset Friends + dropdowns por seccion.
- `src/app/core/models/user.model.ts` — agrega `VisibilityLevel`.
- `src/app/features/public-profile/public-profile.html` y `public-profile.ts` — gates con `xVisibility !== "private"`.

## Commits

### Backend (completr-node-backend)

- `d765723` — chore(migrations): heal Users schema drift with idempotent PK, UNIQUE and defaults
- `87aef55` — chore(migrations): add UserFollowRequests table and FKs
- `965ebd5` — feat(user-follow-requests): gate private profile follows behind pending requests
- `2dae816` — chore(migrations): replace user visibility booleans with three-level enums
- `c1d5a35` — feat(visibility): gate sections by per-section enums with mutual-follow resolver

### Frontend (completr-node-frontend)

- `8cb08eb8` — feat(models): adopt three-level visibility enums on user types
- `22206fee` — feat(privacy): add Friends preset and per-section visibility dropdowns
- `cf8628ee` — feat(profile): wire visibility enums in public profile, feed and discover
