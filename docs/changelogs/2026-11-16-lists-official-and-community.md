# Listas oficiales y de la comunidad paginadas

**Released:** 2026-11-16

## Summary

Los endpoints de descubrimiento de listas devolvían un máximo fijo sin forma de pedir más. `GET /lists/official` y `GET /lists/recent` ahora aceptan `offset` junto a `limit` y responden `total`, y `recent` deja fuera las listas del propio usuario que consulta, también en el estante de Browse que lo consume. La página `/lists` muestra dos secciones paginadas, Official y Community.

## Highlights

- `offset` y `total` en `/lists/official` y `/lists/recent`.
- `recent` nunca incluye las listas del visitante, públicas o privadas.
- La página `/lists` pagina las listas oficiales y las de la comunidad.

## Added

- API: `offset` en `DiscoveryQuerySchema` (por defecto 0) y `total` en la respuesta de ambos endpoints, calculado con `findAndCountAll`.
- Web: llamadas paginadas en `lists.ts` y el componente `app-public-lists-section` (`kind="official"` y `kind="community"`) en `list-overview`.
- Tests de integración de paginación sin huecos ni repetidos y de exclusión de listas propias.

## Changed

- `findRecentUserLists` y `findOfficialLists` reciben la paginación completa y devuelven `{ lists, total }`; `recent` aplica `othersListsCondition` cuando hay visitante.
- `docs/api/lists/get-official.yml` y `get-recent.yml` documentan `offset` y `total`.

## Files of interest

- `apps/api/src/lists/lists.service.ts`
- `apps/api/src/lists/schemas/discovery-query.schema.ts`
- `apps/web/src/app/features/lists/lists.ts`
- `apps/web/src/app/features/lists/components/public-lists-section/public-lists-section.ts`

## Commits

- `ad348dfb` — feat(lists): paginate the discovery endpoints and leave the viewer's own lists out of recent
- `ced1f071` — test(lists): cover discovery pagination, visibility and own-list exclusion
- `44d46a4f` — docs(api): document offset and total on the list discovery endpoints
- `1f533d17` — feat(lists): add paged calls for official and community lists
- `e726c322` — feat(lists): show paginated official and community lists on the lists page
