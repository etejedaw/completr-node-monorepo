# Showcase real en el login, acceso a la beta cerrada, Move to top y platino para admin

**Released:** 2026-10-18

## Summary

Tanda de mejoras de UX en cuatro frentes. El login deja de mostrar portadas inventadas: un endpoint público nuevo, `GET /games/showcase`, entrega juegos reales con portada y un juego destacado con su ratio calculado en la API. Como el registro público está cerrado (`POST /auth/register` exige admin), todos los accesos de invitado que llevaban a `/register` apuntan ahora al formulario de la beta cerrada en la landing, y `/register` redirige allí sin borrar el componente. En la app, Up Next suma "Move to top", crear una lista abre su detalle y el resumen de una run permite agregar otra. Por último, el rol admin estrena un color reservado, platino, que reemplaza al rojo de `danger` en la insignia y al dorado en el anillo del avatar.

## Highlights

- `GET /games/showcase` público con caché en memoria y juego destacado por ratio; el login lo usa para su muro de portadas.
- Variable `landingUrl` y constante `BETA_SIGNUP_URL`: login, header de invitado y perfil público llevan a `#beta-signup` de la landing; `/register` redirige con un guard.
- "Move to top" en Up Next, que reordena a partir de todos los ids de la cola y no solo de las filas visibles.
- Token `--color-admin` (platino) con utilidad `bg-admin-metal`, ícono `shield` en la insignia y anillo de avatar por rol.

## Added

- `games`: `GET /games/showcase`, sin `authMiddleware` y con `publicLimiter`, registrado antes de `/games/:code`. Devuelve hasta 21 juegos activos, sin DLC y con `backgroundUrl`, ordenados por `GamePopularities.score` (con desempate por título e id), más un `featured` con `score`, `hours` y `ratio`. El featured es el juego del set con mejor ratio según el score y la duración canónicos del catálogo (`CANONICAL_SCORE_SUBQUERY` y `CANONICAL_DURATION_SUBQUERY`, ahora exportados desde `search-filters.util.ts`) y `calculateRatio`; si ninguno tiene ambos datos, es `null`.
- `games-showcase.service.ts`: SQL crudo con caché en memoria de 30 minutos, una sola query en vuelo para requests concurrentes y el último resultado como respaldo si el refresco falla. Un resultado vacío no se guarda en caché.
- Bruno: `docs/api/games/showcase.yml`. `docs/invariants.md` documenta el showcase (público, criterio de selección, featured y caché).
- Web: `injectShowcaseGames()` con `httpResource` en `features/auth/showcase-games.ts`.
- Web: `environment.landingUrl` (`http://localhost:4321` en desarrollo, `https://www.completr.app` en producción), `shared/constants/beta-signup.ts` y `core/guards/beta-signup-redirect.guard.ts`.
- `queue`: `QueueService.moveToTop()`, que pide `GET /users/me/queue/backlog-ids`, pone el juego primero y hace el `PUT`. `QueueRow` suma la acción "Move to top" (`vertical_align_top`) en el grupo de hover y en el bottom sheet, solo en orden manual y deshabilitada en la posición absoluta 1.
- `BacklogModal`: `allowNewRun` en los datos y resultado `"newRun"`; en modo resumen muestra "Add new run".
- Web: token `--color-admin` en `styles.css` y en los tres temas, y utilidad `bg-admin-metal` (degradado y borde interior sobre el platino).
- `core/utils/premium.ts`: `avatarRing(role)` y el tipo `AvatarRing`.

## Changed

- `AuthShowcase`: las columnas usan las portadas reales con `GamePoster` y la tarjeta "Up next" muestra el featured. Mientras carga o si falla, quedan los placeholders; la tarjeta se oculta durante la carga.
- Login: línea "Don't have an account? Join the closed beta" bajo el formulario.
- `GuestShell`: "Create account" pasa a "Join the beta". `public-profile`: "Create your free account" pasa a "Join the closed beta".
- `app.routes.ts`: la ruta `register` usa `betaSignupRedirectGuard` y ya no carga `Register`. El componente queda en `features/auth/register/` sin referenciar.
- `ListModal`: `ListModalResult` es una unión discriminada (`created` con la lista, `saved`, `deleted`). `ListOverview` navega a `/lists/:id` tras crear; `ListDetail` solo ajusta la comparación.
- `GameDetail.openRun` abre el modal con `allowNewRun` y, si vuelve `"newRun"`, abre el alta con el juego preseleccionado.
- `role-badge.ts`: `RoleBadge` suma `icon`; admin pasa de `bg-danger/15 text-danger` a `bg-admin-metal text-admin` con `shield`. La insignia se actualiza en `layout.html`, `profile-hero.html` y `admin-users.html`.
- `--color-nav-admin` apunta a `var(--color-admin)` en los tres temas.
- `UiAvatar`: el input booleano `premium` se reemplaza por `ring` (`"premium" | "admin" | null`). Todas las superficies que pintan avatares de usuario pasan `avatarRing(role)`, y el halo del hero del perfil sigue el mismo criterio. `isPremiumRole` no cambia y sigue incluyendo a admin para el gating.
- `docs/context/frontend.md`: token `admin`, anillo del avatar por rol y `nav-admin`.

## Migration

- Quien use `<ui-avatar [premium]="...">` debe pasar `[ring]="avatarRing(role)"`.

## Files of interest

- `apps/api/src/games/services/games-showcase.service.ts`
- `apps/api/src/games/games.serializer.ts`
- `apps/web/src/app/features/auth/auth-showcase/auth-showcase.ts`
- `apps/web/src/app/core/guards/beta-signup-redirect.guard.ts`
- `apps/web/src/app/features/queue/queue.ts`
- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.ts`
- `apps/web/src/app/shared/ui/avatar/ui-avatar.ts`
- `apps/web/src/styles.css`

## Commits

- `e36d496c` — feat(web): add beta signup url constant
- `b912ee40` — feat(web): redirect register route to the beta signup form
- `6842ef14` — feat(web): link login page to the closed beta signup
- `c9889a25` — feat(web): point guest header cta to the beta signup
- `d9cfc802` — feat(web): point public profile cta to the beta signup
- `544d4af3` — feat(games): add public showcase endpoint with featured game
- `fdd3b93e` — docs(games): document public showcase endpoint
- `32e9b2f3` — feat(auth): show real games in login showcase
- `32726ea5` — feat(queue): add move to top action to up next rows
- `8a5a8bb9` — feat(lists): open the list detail after creating a list
- `33c0c577` — feat(game-detail): add new run action to the run summary dialog
- `aa5b6022` — feat(web): add platinum admin color token and metal utility
- `31665feb` — feat(web): show admin role badge in platinum with shield icon
- `e3dc6aff` — docs(web): document admin platinum token
- `6eaf7acf` — fix(games): skip caching an empty showcase result
- `9b441753` — feat(ui): add role-based ring to UiAvatar with platinum for admin
- `77249afa` — feat(web): paint admin avatars with the platinum ring and halo
- `2d1b7dca` — docs(web): document the avatar ring by role
