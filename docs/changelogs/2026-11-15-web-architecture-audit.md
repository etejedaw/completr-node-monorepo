# Auditoría de arquitectura de la web

**Released:** 2026-11-15

## Summary

Auditoría y corrección de `apps/web` y `apps/landing` contra `docs/context/frontend.md`, `docs/rules.md` y la style guide de Angular, en cuatro bloques: base compartida (`shared/`, `core/`, `layout/`, auth, Help, What's new, legal, páginas de error y la landing), biblioteca (backlog, queue, game-shelf, wishlist, favorites, tags, lists y afines), catálogo y admin (`games`, `admin`) y perfil y Rewind (`rewind`, `public-profile`, `settings`, `feed`, `users-discover`). La web adopta los cambios de contrato de la auditoría de la API (404 en recursos ajenos, Problem Details, 500 en auth), protege los envíos dobles, cancela las respuestas viejas y parte los componentes más grandes. Dos ajustes tocan la API: el schema del avatar acepta los presets que la web ya guardaba y `GET /users/me/game-shelf` acepta un filtro por juego.

## Highlights

- La sesión ya no se cierra ante un 500, un 429 o un fallo de red en el refresh, y varias pestañas no se pisan el token.
- Los 404 de recursos borrados o ajenos se tratan como "no existe" y los fallos muestran un estado con reintento en vez del vacío.
- "Use my initial" borra el avatar, y los presets siguen funcionando con el schema nuevo de la API.
- La ficha de un juego sabe si está en My Shelf aunque la estantería tenga más de 100 juegos.

## Refactors (sin cambio de comportamiento)

- Tokens nuevos en `styles.css`: tamaños de texto (`text-micro`, `text-tiny`, `text-caption`, `text-compact`, `text-lead`), `--color-on-image`, `shadow-dialog`, `shadow-drawer` y la utilidad `ui-backdrop`, compartida por diálogo, drawer, hoja inferior y paleta de búsqueda. Los valores arbitrarios repetidos de todos los bloques pasan a esos tokens.
- `shared/ui`: miembros `readonly` y `protected`, `shared/ui/README.md` con el catálogo del design system.
- `core/utils/problem-details.ts` (`problemType`, `isSourceUnavailable`) y `shared/utils/http-failure.ts` (`isNotFound`, `problemTitle`, `reportHttpFailure`); las listas locales de status que copiaban `isToastedByErrorInterceptor` desaparecen.
- `shared/utils/inject-toggle-action.ts` para todo toggle por fila, e `injectFollowActions` e `injectFollowRequestActions` en `shared/utils/`.
- Componentes partidos sin cambio visible: Help en un componente por sección, `game-detail` (`injectGameReport`, `injectGameAdminActions`, `injectGameMoodTags`), `admin-game-editor` (`injectGameSplit`, `injectGameCompilation`), `admin-users` (diálogos de alta y edición), `backlog-modal` (`injectCoopRun`, `injectProgressNotes`), `backlog-list` (`injectViewStats`), `list-detail` (`ListAddGame`) y `public-profile` (`injectPublicProfile` con un `rxResource` por sección). Las plantillas inline grandes del Rewind y del perfil pasan a `templateUrl`.
- `AuthService.changePassword` reemplaza el `HttpClient` de `settings-security`, y `backlog-modal` usa `GamesService.reportGame` en vez de su propio `HttpClient`.
- `adminGuard` y `moderatorGuard` comparten `roleGuard`.
- Landing: `utils/release-tint.ts` reemplaza la función copiada en `Changelog.astro` y `ReleaseCard.astro`, y los colores de marca salen de `--color-brand` con `color-mix`.
- Se quitan los comentarios que quedaban en el código, salvo los de regex.

## Fixed

- **Sesión.** El refresh solo cierra la sesión ante 401 o 403; se serializa entre pestañas con `navigator.locks` y, si otra pestaña ya guardó un token más nuevo, reintenta con ese. `adminGuard` y `moderatorGuard` no mandan a `/403` si el usuario no se pudo cargar por un 5xx. El layout reintenta la carga del usuario y avisa si falla.
- **Envíos dobles.** Login, forgot-password, reset-password, guardar perfil, privacidad y contraseña, seguir, aceptar solicitudes, reseñas, jobs y los toggles de favoritos, Want to Get, Up Next y listas ignoran el segundo envío, también con Enter repetido.
- **404 y errores.** list-detail, vistas guardadas, run modal, queue, wishlist, reportes, jobs, invitaciones, feed y solicitudes de seguimiento tratan un 404 como "ya no existe" (quitan la fila, recargan o muestran el vacío). list-detail, feed, Users y el perfil público muestran un estado de error con reintento ante un 5xx o sin red. La búsqueda de Users ya no muere tras un error.
- **Respuestas desordenadas.** La ficha de un juego, sus reseñas y la actividad social, el perfil público, list-detail, el feed y las invitaciones cancelan la carga anterior; una respuesta lenta ya no pisa la del juego, usuario, mes o filtro actual.
- **Contrato con la API.** accept-invite distingue una invitación inválida (404) de una no comprobable (5xx, 429, red); reset-password distingue un enlace inválido de una contraseña que no cumple la política; login muestra un mensaje por status; What's new y Privacy explican el 503 `COMMON_SOURCE_UNAVAILABLE`; los reportes muestran su `category`; cancelar un job inexistente recarga la lista; borrar una actividad que ya no existe (`ACTIVITY_NOT_FOUND`) cuenta como hecho y Undo restaura solo esa actividad.
- **Avatar.** `AvatarUrlSchema` acepta una URL `http(s)` de hasta 255 caracteres o una ruta `/avatars/completr_profile_NN.png`, y `PATCH /users/me` acepta `avatarUrl: null`. La web manda el avatar solo si cambió y `null` para "Use my initial". Corrige una regresión de la auditoría de la API, que no llegó a producción: con el schema nuevo, quien tenía un preset no podía guardar ningún cambio del perfil (422). En producción el error real era otro: "Use my initial" no borraba el avatar.
- **My Shelf en la ficha.** `GET /users/me/game-shelf` acepta `game_id` (uuid, opcional; con un parámetro desconocido responde 422) y la ficha pregunta por el juego abierto en vez de buscarlo en los primeros 100.
- **Rewind.** "More Rewinds" pasa `premiumAccess` y `period`, así que Generate ya no queda muerto; `ProfileRewinds` recibe `period`; los valores de los gráficos se ven sin hover; una descarga de imagen fallida avisa.
- **Otros.** Wishlist renumera las posiciones al quitar; error-pages ofrece "Sign in" a visitantes y un "Go back" seguro; `StorageService` tolera el almacenamiento bloqueado y lo usan onboarding, tema y layout; `GamesService` devuelve los sobres de scores y times sin desenvolverlos.
- **Landing.** `security-headers.conf` se incluye en cada `location` de `nginx.conf` (antes los `.json` y los estáticos salían sin CSP, HSTS ni `nosniff`) e `immutable` queda solo para `/_astro/` y `/fonts/`; el formulario de beta no se reactiva al redirigir; enlace "Saltar al contenido".
- **Dorado premium.** Se restaura el marcador dorado que la auditoría había quitado de los contadores de tope, el aviso "frozen" de vistas guardadas y listas, la opción Premium y el selector de features de Admin, el botón "Premium access" y el ícono del AI recap en Help.

## Changed

- Documentación: `docs/rules.md` documenta los avatares preset, el lock del refresh, los marcadores dorados y la visibilidad de lo premium, la zona premium del Rewind, los tokens `--color-view-*` y el catálogo actualizado; `docs/context/frontend.md` documenta el 404 como "no existe", el doble envío, las respuestas desordenadas, la sesión, el almacenamiento, los tokens de texto y de imagen y la convención de nombres de `shared/ui`; `docs/context/landing.md` documenta `security-headers.conf` y el skip link. Bruno: `users/update-me.yml`, `auth/register.yml` y `game-shelf/get-my-shelf.yml`.

## Migration

- Sin migraciones: `Users.avatarUrl` ya admitía `NULL`.

## Commits

- `b583d1e6` — style(web): add text size, on-image color, dialog and drawer shadow tokens and the shared backdrop utility
- `e5244584` — refactor(shared): use text and on-image tokens, shared backdrop and readonly protected members in the design system
- `475489f3` — refactor(core): extract a problem details type helper
- `d634e2d2` — fix(auth): keep the session when the refresh fails with a server error and serialize refreshes across tabs
- `8b6688f3` — fix(guards): block role guards without redirecting to 403 when the user fails to load
- `3ff66709` — fix(storage): tolerate blocked storage and route onboarding and theme through it
- `78a74ae6` — fix(layout): clean up router subscriptions, retry the user load and use the storage service
- `d3fa279f` — test(layout): cover user loading failures, slash shortcut and guest shell scroll
- `8f5fbbd9` — fix(auth): prevent double submits and tell unavailable invitations from invalid ones
- `fc4c9f38` — fix(whats-new): explain an unavailable changelog or privacy source and cover both pages
- `15f4f424` — refactor(help): split the help page into one component per section
- `67a4f335` — fix(error-pages): offer sign in to visitors and a safe go back
- `f888e32e` — test(about): cover the about page
- `d96ab8fe` — docs(ui): add the design system catalog
- `6dd03b74` — fix(landing): keep security headers on every nginx location and limit immutable caching to hashed assets
- `1f938243` — fix(landing): block double submits in the beta form and use the danger token
- `708495f5` — feat(landing): add a skip to content link
- `f7efe7f2` — refactor(landing): share the release tint styles and build brand colors from tokens
- `437417c5` — feat(web): add toggle action and http failure helpers
- `f45c62ea` — fix(lists): handle missing lists and load failures in list detail
- `5c1225e2` — fix(wishlist): renumber positions on remove and guard erratic clicks
- `1c27410f` — refactor(backlog): extract view stats, coop and progress composables
- `e5b2ccfe` — fix(backlog): report failures and missing views in saved views
- `2a13be1c` — fix(queue): reuse interceptor status helper in up next
- `c34afc1c` — fix(game-shelf): guard favorite and wanted toggles in my shelf
- `18c455cd` — fix(favorites): guard favorite toggles in the favorites view
- `09224c50` — fix(tags): reuse interceptor status helper for tag errors
- `93970834` — fix(lists): drop gold counters and frozen alert tone in lists
- `2da78bc9` — test(backlog-progress): expect not found for runs of other users
- `a53aaf78` — refactor(web): use shared chips and icon buttons for calendar and reorder
- `21f2a6a8` — style(web): use shared text and shadow tokens and narrow member visibility
- `75097551` — fix(api): accept preset avatar paths and null avatar on profile update
- `1ab51bda` — test(api): cover avatar url schema with garbage input
- `da0965e5` — docs(api): document avatar url rules in bruno collection
- `f269426f` — refactor(web): move follow actions to shared and add follow request actions
- `db730ee1` — fix(settings): send avatar only when changed, guard double submits and move password change to auth service
- `1eb5d056` — fix(feed): cancel stale loads, show errors and restore only the removed activity on undo
- `2fa4da2f` — fix(users-discover): keep search alive after errors and expose follow actions directly
- `87cfd00c` — refactor(public-profile): split profile page into per-section resources and extract template files
- `fdbbf98f` — fix(public-profile): share access error mapping, pass rewind period and use tokens on hero images
- `de9dffd1` — refactor(rewind): move large inline templates to template files
- `b0337d72` — fix(rewind): pass access to more years, show chart values without hover and toast failed downloads
- `b7b368ec` — test(settings): cover avatar changes, double submits and shared follow request actions
- `3095161e` — test(feed): add erratic specs for feed page and activity item
- `9cbc4450` — test(users-discover): cover search errors and double follow clicks, move follow actions spec to shared
- `7df2f43a` — test(public-profile): cover stale responses, errors and access error mapping
- `029681e3` — test(rewind): cover error mapping, more years access and failed downloads
- `fe1e6ce9` — refactor(games): extract split and compilation flows from the game editor
- `0c927a1a` — test(games): cover split and compilation flows
- `c8f19be5` — refactor(games): extract report, admin actions and mood tags from game detail and cancel stale loads
- `cafc709b` — test(games): cover game detail report, admin actions, mood tags and navigation races
- `c358bc6d` — fix(games): ignore stale reviews and social activity answers and guard repeated review submits
- `96c49980` — test(games): cover review errors and social activity ordering
- `b559b8a4` — fix(games): type score and time responses
- `a4dfe9bd` — style(games): use shared text, image and shadow tokens
- `fe585d5b` — refactor(admin): split the create and edit user dialogs out of the users page and reuse the password policy
- `b8081fee` — test(admin): cover user validation and the user and report services
- `15ee5bc5` — fix(admin): show report categories and drop reports that no longer exist
- `d357b411` — test(admin): cover report categories and resolving missing reports
- `beb81f38` — fix(admin): reload jobs after cancelling a missing job and guard repeated starts
- `9eaa202c` — test(admin): cover job cancellation errors and reload ordering
- `6ede8f0f` — fix(admin): cancel pending requests on destroy and reload invitations after a missing revoke
- `a728676f` — test(admin): cover invitation flows with repeated and failed requests
- `d7f6e4a7` — style(admin): use shared text tokens and remove gold outside premium frames
- `cee91e99` — fix(game-shelf): filter the own shelf by game_id
- `1cd0692b` — test(game-shelf): cover the game_id filter
- `9e4ead8f` — docs(bruno): document the game_id filter of my game shelf
- `d8f68940` — fix(games): ask the shelf for the opened game instead of the first hundred entries
- `48fd4a12` — fix(games): return the score and time envelopes without unwrapping them
- `67b8a13e` — fix(web): restore the gold marker on premium counters, alerts and admin premium controls
- `cfd67a70` — docs: document the web audit rules, premium markers, new shared ui pieces and landing headers
