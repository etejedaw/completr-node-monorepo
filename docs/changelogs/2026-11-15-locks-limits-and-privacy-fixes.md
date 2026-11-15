# Locks, límites y privacidad en listas, tags, follows y reseñas

**Released:** 2026-11-15

## Summary

Correcciones de concurrencia y de privacidad encontradas en una auditoría del backend. El advisory lock y la compactación de posiciones, que cada service reescribía, pasan a `common/utils/`; las escrituras que no tomaban el lock ahora lo toman; los duplicados que acababan en 500 responden 409, y dos listados que ignoraban la visibilidad o no paginaban quedan corregidos.

## Highlights

- El límite free de mood tags ya no se puede saltar con peticiones paralelas.
- Quien oculta que sigue una lista deja de aparecer entre sus seguidores, salvo para el dueño de la lista.
- Un follow o un ítem de lista duplicado responde 409 en vez de 500.

## Added

- `common/utils/acquire-advisory-lock.util.ts`, `acquire-advisory-locks.util.ts` (varios locks en una sola consulta, en orden de clave) y `compact-positions.util.ts`. Sustituyen las copias de `queue`, `wishlist`, `favorites`, `game-shelf`, `lists`, `list-items`, `mood-tags`, `saved-filters`, `jobs` y `auth/services/password-reset`. Las claves de lock no cambian.
- Web: botón "Load more reviews" en la ficha de un juego.

## Changed

- `GET /lists/:listId/followers` pagina (`limit`, `offset`, 24 por defecto) y responde `{ users, total }`. El dueño de la lista ve a todos; el resto solo a quienes tienen `isVisible`. Excluye usuarios inactivos.
- `GET /games/:id/reviews` pagina (100 por defecto y como máximo) y responde `{ reviews, total }`. Excluye autores inactivos. `playthroughDuration` solo se adjunta si el backlog del autor es visible para quien mira. Una reseña sigue siendo pública siempre.
- `route-middleware-order.unit.test.ts` descubre todos los `*.routes.ts` en vez de una lista fija.
- `docs/rules.md` documenta los tres helpers en los mecanismos compartidos; Bruno: reseñas, seguidores de lista, ítems de lista, follow y aceptar solicitud.

## Fixed

- **Mood tags.** `createTag` y `setTagDescription` corren en transacción con el lock del usuario y resuelven el acceso premium antes de abrirla.
- **Ítems de lista.** `replaceItems`, `removeItem` y `setGameLists` toman el lock y releen dentro de la transacción; antes solo lo hacía `addItem` y dos escrituras simultáneas podían repetir una posición. `setGameLists` toma los locks de todas las listas en una consulta, así que el número de consultas no crece con el de listas.
- **Errores sin mapear.** `USER_FOLLOWER_ALREADY_FOLLOWING`, `LIST_ITEM_UNIQUE_CONSTRAINT` y `SAVED_FILTER_UNIQUE_CONSTRAINT` responden 409; `USER_FOLLOWER_VALIDATION_ERROR` y `LIST_ITEM_VALIDATION_ERROR`, 422. Antes caían al 500 del módulo.
- **Orden de middlewares.** `GET /lists/following` y `story-list.png` autentican antes del rate limiter, así que admin y moderador ya no cuentan como anónimos.

## Files of interest

- `apps/api/src/common/utils/acquire-advisory-lock.util.ts`
- `apps/api/src/common/utils/compact-positions.util.ts`
- `apps/api/src/mood-tags/mood-tags.service.ts`
- `apps/api/src/list-items/list-items.service.ts`
- `apps/api/src/list-followers/list-followers.service.ts`
- `apps/api/src/reviews/reviews.service.ts`

## Commits

- `a8a27ea2` — refactor(api): share the advisory lock and position compaction helpers
- `76019206` — fix(mood-tags): enforce the free tag limit under a lock when creating or describing tags
- `e212815e` — fix(list-items): lock the list on every item write
- `eeaacc3e` — fix(api): map unique and validation errors of follows, list items and saved filters
- `e78accd8` — fix(list-followers): paginate the followers of a list and respect their visibility
- `d4912489` — fix(reviews): paginate game reviews and show playthrough duration only to those who can see the backlog
- `e4153a1f` — feat(web): load more game reviews page by page
- `b1f0262f` — fix(api): authenticate before rate limiting the story list image
- `2b50fe69` — perf(list-items): take every list lock in a single ordered query
