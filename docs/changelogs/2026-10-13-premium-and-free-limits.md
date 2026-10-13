# Límites del plan free e identidad visual premium

**Released:** 2026-10-13

## Summary

Se completa el gating por plan en la API y se hace visible en la app web. My Shelf y los mood tags suman topes para usuarios free, el feed y las reseñas exponen el rol del autor, y la web marca a los usuarios premium con un anillo de color en el avatar. Cuando la API responde 402 por un límite, un interceptor muestra un toast con el motivo. Para que el color premium sea propio, el token `warning` se separa en `rating`, `playing` y `premium`.

## Highlights

- `POST /game-shelf` responde 402 `GAME_SHELF_LIMIT_REACHED` al superar el tope free.
- Los endpoints de `mood-tags` responden 402 `MOOD_TAGS_LIMIT_REACHED` al introducir un nombre de tag nuevo sobre el tope.
- Avatares con anillo premium en layout, búsqueda global, descubrir usuarios, feed y reseñas.
- Toast con variante premium y mensajes por tipo de límite.

## Added

- `game-shelf`: error `GAME_SHELF_LIMIT_REACHED` (402) y constante `FREE_SHELF_LIMIT` en `game-shelf.service.ts`. Premium, moderator y admin quedan exentos.
- `mood-tags`: error `MOOD_TAGS_LIMIT_REACHED` (402) y constante `FREE_TAG_LIMIT`. El tope cuenta nombres de tag distintos (asignados a juegos más los creados sin juego). Solo bloquea introducir un nombre nuevo: asignar, renombrar o borrar tags existentes sigue permitido sobre el tope.
- `activity` y `reviews`: el autor incluye `role` en los payloads del feed y de las reseñas.
- Web: `isPremiumRole` (`core/utils/premium.ts`) y anillo premium en `ui-avatar`, usado en `layout`, `global-search`, `user-card`, `feed-activity-item` y `review-card`.
- Web: `planLimitMessage` (`core/utils/plan-limit-message.ts`), con un mensaje por cada código de límite o congelamiento. `error.interceptor` lo muestra como toast en respuestas 402.
- Web: variante `premium` de `ToastService` con título (`premium(title, message)`) y `toast-container`.
- Web: insignias de beneficio premium en `game-shelf-list`, `tags-page` y `list-overview`.
- Tokens de color `--color-premium`, `--color-rating` y `--color-playing` en los cuatro temas de `styles.css`.

## Changed

- `USER_PUBLIC_ATTRS` incluye `role`.
- `--color-warning` pasa a un naranja (`#f97316`); el ámbar queda como `--color-premium`. Los usos de `warning` para estado "playing" y valoraciones migran a `--color-playing` y `--color-rating` en 35 plantillas.
- Las etiquetas de beneficio premium de favorites, queue, wishlist, saved filters y feed se reescriben y usan el token premium.
- `saved-filters`: se quita `amber` de los colores permitidos, porque se confundía con el color premium. `supportedSavedFilterColor` descarta en la web los colores que ya no existen.
- `list-items`: `FREE_LIST_LIMIT` se renombra a `FREE_OWNED_LISTS_LIMIT`.
- `docs/invariants.md` lista `game-shelf` y `mood-tags` entre los recursos con tope por rol, y aclara que el backlog no tiene tope.

## Files of interest

- `apps/api/src/game-shelf/game-shelf.service.ts`
- `apps/api/src/mood-tags/mood-tags.service.ts`
- `apps/api/src/users/constants/user-attrs.constants.ts`
- `apps/web/src/app/core/utils/plan-limit-message.ts`
- `apps/web/src/app/core/interceptors/error.interceptor.ts`
- `apps/web/src/app/shared/ui/avatar/ui-avatar.ts`
- `docs/invariants.md`

## Commits

- `149bfbcf` — feat(web): ring premium avatars with the premium color
- `a652aa87` — feat(api): expose author role in feed and review payloads
- `db29a2f6` — feat(web): ring premium avatars in feed and reviews
- `fc60783a` — feat(game-shelf): enforce free plan limit on My Shelf
- `168b459b` — feat(mood-tags): enforce free plan limit on distinct tags
- `8268086a` — refactor(saved-filters): drop amber from saved filter colors
- `4e0d5911` — refactor(web): split warning token into rating, playing and premium colors
- `8608909f` — feat(web): show premium perk badges on My Shelf and tags
- `b4b3c413` — refactor(web): reword premium perk labels and use premium token
- `b8a22cde` — feat(web): add premium toast variant with title
- `b1d03826` — feat(web): show plan limit toasts from 402 responses in interceptor
- `88807788` — feat(web): show premium perk badge on lists overview
- `615ccc86` — refactor(list-items): rename free list limit to owned lists limit
