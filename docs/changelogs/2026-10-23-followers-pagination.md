# Paginación y búsqueda de seguidores y seguidos

**Released:** 2026-10-23

## Summary

`GET /users/:username/followers` y `GET /users/:username/following` devolvían todos los usuarios de una vez, y el web filtraba la búsqueda en el cliente. Ahora los dos endpoints paginan y buscan en SQL, y las tarjetas se arman solo para la página pedida. La respuesta suma `total`, así que la API y el web se despliegan juntos.

## Highlights

- Query `limit` (1–100, 24 por defecto), `offset` y `search` (sobre `username` y `name`, sin distinguir mayúsculas).
- Paginación y búsqueda en el servidor en la pantalla de conexiones de un perfil.

## Added

- `common/utils/escape-like-pattern.util.ts`: escapa `\`, `%` y `_` para que la búsqueda sea literal.
- `UserConnectionCardsBundle` (`{ cards, total }`) en `users.interface.ts`.
- `PublicSocialService.getAllFollowing`: recorre todas las páginas, para el selector de amigos de co-op del backlog.

## Changed

- `user-followers.routes` valida el query con `PaginatedSearchQuerySchema`. El controller responde `{ data: { users, total } }`.
- `user-followers.service`: `getFollowers` y `getFollowing` reciben el `userId` ya resuelto y usan `findAndCountAll` con `distinct`, orden `createdAt DESC, id DESC` y usuarios activos. El número de consultas no crece con `limit`.
- `users-profile.service.getConnectionCardsForUsername` recibe el query y devuelve `{ cards, total }`. Las reglas de acceso (403/404) no cambian.
- `user-connections`: estado `search`, `offset` y `total`; búsqueda con debounce de 300 ms que vuelve a la primera página; `ui-pagination`; y salto a la última página válida si el `offset` queda fuera de rango. Se elimina el filtro en el cliente.
- `backlog-modal` usa `getAllFollowing` para el selector de amigos de co-op.
- `docs/api/user-followers/get-followers.yml` y `get-following.yml` documentan los params, `total` y el error 422 correcto (`COMMON_SCHEMA_INVALID`). `docs/invariants.md` suma la regla de paginación.

## Files of interest

- `apps/api/src/user-followers/user-followers.service.ts`
- `apps/api/src/users/users-profile.service.ts`
- `apps/web/src/app/features/public-profile/user-connections/user-connections.ts`

## Commits

- `ba773343` — feat(user-followers): paginate and search the followers and following endpoints
- `6954cd55` — test(user-followers): cover pagination, search, stable order and query count of connections
- `2335f1f8` — docs(api): document pagination and search of followers and following
- `c915160b` — feat(web): paginate connections and search them on the server
- `202d560b` — test(web): cover paginated connections, debounced search and out of range offsets
