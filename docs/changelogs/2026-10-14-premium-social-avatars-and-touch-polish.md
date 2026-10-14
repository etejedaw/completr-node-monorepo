# Premium en la actividad social del juego y retoques táctiles

**Released:** 2026-10-14

## Summary

Cierra tres pendientes menores del rediseño. La actividad social del detalle del juego (amigos y otros jugadores) ahora pinta el borde Premium en los avatares: la API envía `role` en ambos endpoints, como ya lo hacían las tarjetas de usuario, la actividad y las reseñas. Además, el botón Dismiss del toast alcanza 44 px táctiles y las filas de partidas del juego usan un token de hover en lugar de blanco con alfa.

## Added

- `games`: `GET /games/:id/friends-activity` y `GET /games/:id/players` incluyen `role` en cada ítem. Cambio aditivo, sin migración: las consultas ya traían `role` con `USER_PUBLIC_ATTRS`, solo faltaba en `gameFriendActivitySerializer` y `gamePlayerSerializer`.
- Bruno: `docs/api/games/friends-activity.yml` y `players.yml` documentan `role` y sus valores.

## Changed

- `game-social-activity`: `UiAvatar` recibe `[premium]` con `isPremiumRole()` (premium, moderator y admin). Se quitó `hasContent()`, que no se usaba.
- `backlog.model.ts`: el tipo declarado de `Backlog.User` suma `role: UserRole` (solo tipos).
- `toast-container`: el botón Dismiss lleva `type="button"`, mide 28 px en escritorio con mouse y 44 px bajo 768 px o con puntero grueso (`max-md:` + `tap:`, igual que el Undo), con hover de superficie y `focus-visible` con `outline-brand`.
- `game-runs`: la fila de partida usa `hover:bg-surface-hover` en lugar de `hover:bg-white/[0.03]`, que no respetaba los temas.

## Files of interest

- `apps/api/src/games/games.serializer.ts`
- `apps/web/src/app/features/games/game-detail/components/game-social-activity.ts`
- `apps/web/src/app/shared/components/toast-container/toast-container.html`

## Commits

- `06d66078` — style(game-detail): use surface hover token on run rows
- `dfe17cd5` — style(web): give toast dismiss button a 44px touch target
- `52a09c01` — feat(games): include user role in friends activity and players
- `e89c505c` — docs(api): document role in game friends activity and players
- `6f79f17f` — feat(game-detail): show premium avatar border in social activity
