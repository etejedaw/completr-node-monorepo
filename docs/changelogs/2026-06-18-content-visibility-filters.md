# Content visibility filters: reviews and feed

**Released:** 2026-06-18

## Summary

Ajustes en que contenido aparece en dos superficies sociales del producto: las reviews ahora incluyen entries con solo `score` (sin texto) en el perfil y vista dedicada, y las activities de tipo follow ya no se cuelan al feed publico ni al activity del perfil ajeno. Resuelve FB-026, FB-029 y FB-033. Cambios backend-only, sin migracion de schema.

## Highlights

- Las valoraciones con solo nota (sin comentario) cuentan como "review" en el perfil y en `/user/:username/reviews`.
- "@x empezo a seguir a @y" deja de aparecer en el feed global y de seguidos.
- El owner sigue viendo sus propias actividades sociales en su perfil (utiles para futuras notificaciones).

## Changed

- `findReviewsByUserId` y `findReviewsByUserIdPaginated` usan ahora el predicado `hasContentOrRating` en lugar de `hasContent`. Antes solo aparecian reviews con texto no vacio; ahora tambien las que tienen solo `rating`.
- `getFeed` filtra los tipos sociales `user_followed` y `user_followed_by` via `Op.notIn`. Las filas se conservan en DB para reutilizar cuando exista el sistema de notificaciones.
- `getUserActivity` acepta un nuevo `options: { includeSocial }` (default `false`). El controller del perfil pasa `isSelf` como valor, asi que solo el dueno ve sus propios follows en su activity feed.

## Files of interest

- `src/reviews/reviews.service.ts` — predicado `hasContentOrRating`.
- `src/activity/activity.service.ts` — constante `SOCIAL_TYPES` y filtros en `getFeed` / `getUserActivity`.
- `src/users/users.controller.ts` — caller de `getUserActivity` pasa `includeSocial: isSelf`.

## Commits

- `c42c536` — fix(reviews): include rating-only entries in user reviews listings
- `352953f` — feat(activity): exclude follow types from feed and non-self profile activity
