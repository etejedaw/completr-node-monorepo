# Búsqueda de usuarios en Admin

**Released:** 2026-11-02

## Summary

Admin → Users solo paginaba. `GET /admin/users` acepta ahora `q`, que filtra por username, nombre o email con el buscador de texto común (`buildTextSearchWhere`), así que no distingue mayúsculas ni acentos y busca por palabras, igual que `GET /users/search`. La web suma una barra de búsqueda que descarta las respuestas viejas.

## Added

- `AdminUsersQuerySchema` (`apps/api/src/users/schemas/admin-users-query.schema.ts`): `limit` (1-100), `offset` y `q` recortado de hasta 100 caracteres; vacío o solo espacios no filtra, más de 100 responde 422 `COMMON_SCHEMA_INVALID`.
- `findAllUsers(limit, offset, query?)` filtra por `username`, `name` y `email` y devuelve el `total` filtrado.
- Colección Bruno: `docs/api/users/admin-list.yml`, que no existía.
- Web: `UserAdminService.listUsers` manda `q`; Admin → Users suma `LibraryToolbar` con `UiSearchBar` (debounce de 300 ms, cancela la petición anterior y vuelve a la página 1), `UiNoMatches` con "Clear search" y un anuncio `role="status"` con la cantidad de coincidencias. El total del hero no cambia al buscar.

## Changed

- `docs/invariants.md`: contrato de `GET /admin/users` y su `q` en las reglas de búsqueda de texto.

## Files of interest

- `apps/api/src/users/users.service.ts`
- `apps/api/src/users/schemas/admin-users-query.schema.ts`
- `apps/api/test/admin/admin-users.integration.test.ts`
- `apps/web/src/app/features/admin/admin-users/admin-users.ts`

## Commits

- `09f9cb42` — feat(users): search the admin user list by username, name or email
- `8d7f87c3` — docs(api): document the admin user list and its search
- `917a9a47` — feat(admin): send the user search to the admin user list
