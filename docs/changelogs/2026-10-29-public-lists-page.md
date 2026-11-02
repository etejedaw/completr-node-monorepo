# Listas del perfil con "See all" y página de listas públicas

**Released:** 2026-10-29

## Summary

El perfil cargaba todas las listas creadas y seguidas del usuario y las desplegaba en el mismo lugar con un "Show all lists", así que un usuario con muchas listas sobrecargaba el perfil y la petición. Ahora el perfil pide solo 6 por grupo (Created y Following), muestra 6 en escritorio y 3 en mobile con el total de cada grupo, y un "See all" en el encabezado de la sección lleva a la página nueva `/user/:username/lists`. Para eso, `GET /users/:username/lists` y `GET /users/:username/following-lists` suman paginación y búsqueda opcionales sin cambiar sus reglas de visibilidad. Sin `limit` responden igual que antes.

## Highlights

- `limit` (1-100), `offset` (≥ 0) y `search` (1-100) en los dos endpoints, con `total` sin paginar y orden `createdAt DESC, id DESC`.
- Página `/user/:username/lists`:
    - pestañas Created y Following (`?tab=following`) con su conteo;
    - búsqueda en servidor con debounce;
    - paginación de 24 y grilla de `ListCard` de 1, 2 o 3 columnas.
- El perfil muestra "See all" solo si algún grupo tiene más listas de las que se ven.

## Added

- `UserListsQuerySchema` (estricto): un parámetro desconocido o inválido responde 422 `COMMON_SCHEMA_INVALID`.
- `user-lists`, con `user-lists-tab`, y la ruta `user/:username/lists`. Los 403 y 404 usan `ProfileAccessState`; un 5xx o un fallo de red muestran un estado de error con "Try again".
- Bruno: `get-user-following-lists.yml`, que no estaba documentado.

## Changed

- `/users/:username/lists` valida la query, que antes no se validaba, y `/following-lists` pasa de `PaginationQuerySchema` al schema estricto.
- `listsService.findPublicListsByUserId` usa `findAndCountAll` con `limit`, `offset` y `search`. `total` sale del conteo de la consulta.
- La búsqueda por nombre sigue las reglas unificadas de búsqueda de texto: ignora acentos, mayúsculas y orden de palabras, y trata los comodines de forma literal.
- `ProfileLists` pide `limit: 6`, cuenta con `total` y deja de desplegar las listas inline.

## Fixed

- `get-user-lists.yml` documentaba un 422 `SCHEMA_VALIDATION_ERROR` inexistente; ahora es `COMMON_SCHEMA_INVALID`.

## Files of interest

- `apps/api/src/users/schemas/user-lists-query.schema.ts`
- `apps/api/src/lists/lists.service.ts`
- `apps/web/src/app/features/public-profile/user-lists/user-lists.ts`
- `apps/web/src/app/features/public-profile/components/profile-lists.ts`

## Commits

- `0a703d60` — feat(users): paginate and search user lists and following lists
- `d6f4d740` — test(users): cover pagination, search and visibility of user lists endpoints
- `b3e9c0d1` — docs(api): document pagination and search of user lists endpoints
- `c21a9b86` — feat(public-profile): add public lists page with created and following tabs
- `bf1837af` — feat(public-profile): show a few lists per group on the profile with a see all link
- `20b96e67` — test(public-profile): cover public lists page and profile lists see all link
- `12598a25` — docs(frontend): mention the public lists page among list views
