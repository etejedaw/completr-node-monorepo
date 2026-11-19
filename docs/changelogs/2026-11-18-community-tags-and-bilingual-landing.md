# Tags de la comunidad, vistas modificadas y landing bilingüe

**Released:** 2026-11-18

## Summary

Las etiquetas que cada usuario pone a sus juegos pasan a contar como votos anónimos: un tag se vuelve público en un juego cuando lo usan al menos 2 jugadores distintos (`COMMUNITY_TAG_MIN_PLAYERS`), y con ese umbral aparecen en la ficha del juego, en `/tags/:tag`, en `/tags`, en el buscador y como sugerencias al añadir un juego. El conteo se calcula al leer con `GROUP BY ... HAVING`, sin contador ni job, y ninguna respuesta identifica a quién votó. Cada usuario elige además sus tags favoritos, que se muestran en el perfil detrás de una sección de privacidad nueva (`tagVisibility`), y puede darles un ícono y un color con la misma paleta de las vistas guardadas. Las listas propias (My Games, Up Next, My Shelf, Want to Get, Favorites y Platinums) y sus exports filtran por los tags del usuario con un solo mecanismo (`MoodTagsFilterSchema` y `taggedGameIdsFilter`). En My Games, cambiar los filtros rápidos ya no desactiva la vista guardada: la deja "modificada", con "Save to view" y "Reset view", una URL que describe solo lo que difiere y stats calculadas con los filtros aplicados. La landing se reordena alrededor del Ratio, los tags de ánimo y el Rewind, con un hero nuevo, y se sirve en español e inglés con el i18n nativo de Astro y una redirección por idioma en nginx.

## Highlights

- Tags de la comunidad con votos anónimos y umbral de 2 jugadores: ficha del juego, página de un tag, página de tags populares y favoritos, búsqueda y sugerencias al añadir.
- Filtro por tags propios en My Games, Up Next, My Shelf, Want to Get, Favorites y Platinums, y en sus exports.
- Vista guardada modificada en My Games: Save to view, Reset view y stats con los filtros aplicados.
- Landing bilingüe en `/es` y `/en`, con hero, secciones, imagen para compartir y changelog público en los dos idiomas.

## Added

- `mood-tags` (API): `GET /games/:gameId/tags`, `GET /tags/popular`, `GET /tags/search`, `GET /tags/:tag/games` y `PUT /users/me/mood-tags/favorites`. Los endpoints comunitarios devuelven solo conteos (`players`, `games`) y `mine`; las cuentas desactivadas no cuentan como jugadores y los juegos inactivos no aparecen.
- `mood-tags` (API): favoritos como posiciones de `MoodTagMetas.favoriteOrder`, escritos bajo el lock `mood-tags:<userId>` junto con renombrar y borrar. Renombrar conserva la posición, fusionar deja la menor y borrar compacta el resto.
- `mood-tags` (API): `icon` y `color` por tag, validados contra `APPEARANCE_ICONS` y `APPEARANCE_COLORS` (`common/constants/appearance.constants.ts`, compartidos con las vistas guardadas). Solo salen en `GET /users/me/mood-tags`, en los favoritos del perfil y en el export, nunca en los endpoints comunitarios.
- `mood-tags` (API): `taggedGameIdsFilter` y `MoodTagsFilterSchema`, el filtro `mood_tags` reutilizable (semántica AND, tope `MAX_TAGS_PER_GAME`, subconsulta en el `WHERE` para que `limit`, `offset` y `total` cuenten solo lo filtrado).
- `queue`, `game-shelf`, `wishlist`, `favorites` y `game-platinum` (API): `mood_tags` en la lista propia y en su export.
- `users` (API): sección de privacidad `tagVisibility` y `GET /users/:username/tags` con los favoritos del perfil detrás de esa sección.
- `games` (API): servicio que expone los juegos activos con su ratio a otros módulos, usado por `GET /tags/:tag/games`.
- `common` (API): condición de búsqueda de texto en SQL crudo para la búsqueda de tags.
- `data-requests` (API): el export de datos personales incluye el orden de los tags favoritos y `tagVisibility`.
- Ficha del juego (web): `game-tags` con los tags de la comunidad, voto desde la ficha y un input con autocompletado.
- `features/tags` (web): página `/tags/:tag` con los juegos de un tag y página `/tags` con los populares y la elección de favoritos.
- Buscador (web): sección de tags en la paleta de búsqueda.
- `backlog-modal` (web): sugerencias de tags de la comunidad al añadir un juego.
- Perfil público (web): `profile-favorite-tags` con los favoritos, su ícono y su color.
- Privacidad (web): sección Tags en los ajustes de privacidad.
- `inject-my-tag-filter` y `my-tag-filter` (web): filtro compartido por tags propios que guarda `mood_tags` en la URL, usado en My Games, Up Next, My Shelf, Want to Get, Favorites y Platinums. En Up Next reordenar dentro del filtro funciona como en una búsqueda y en Favorites el reordenamiento se bloquea mientras hay filtro.
- `backlog-table` (web): columna de tags en la tabla hardcore.
- `inject-tag-list-sync` (web): sincronización serializada de la lista de tags para que pedidos encadenados no se pisen.
- `UiMultiOptionPicker` (web): variante compacta, íconos por opción y sustantivo singular. `UiOptionPicker`: marca de selección modificada y acciones `link` que se dibujan como enlace real en el menú y en la hoja.
- `Moods` y `Rewind` (landing): sección de tags de ánimo con una demo de "Sorpréndeme" que menciona los tags de la comunidad y la búsqueda, y sección propia del Rewind con las dos imágenes para historias.
- Landing: `og-en.png` como imagen para compartir en inglés.

## Changed

- My Games (web): cambiar estado, tags, el panel Filters o el orden deja la vista activa y "modificada" en vez de desactivarla. "Save to view" manda un `PATCH` optimista solo con `filters`, `sortBy` y `sortOrder`; el Clear de la barra pasa a ser "Reset view". La URL lleva `savedFilterId` y solo los parámetros que difieren de la vista (`view-url-state`).
- `saved-filters` (API y web): `GET /users/me/saved-filters/:id/stats` acepta los filtros del backlog y la web los manda mientras lo aplicado difiere de lo guardado, así que las stats de una vista modificada siguen a lo que se ve. Se quita el aviso de que las stats eran las de la vista guardada.
- My Games (web): el filtro por tags pasa a ser de tags propios, desde la barra, con sus íconos; el filtro `community_tags` del backlog que se agregó en esta misma tanda se retira de la API y de la web.
- Web: el servicio de tags se mueve a `core` y los helpers de tags se comparten entre features; el selector de ícono y color de las vistas guardadas se comparte con los tags.
- Login (web): el tagline pasa a ser "You'll always know what to play."
- Landing: hero "Siempre sabrás qué jugar" / "You'll always know what to play" en vez del anuncio de la 1.1, home ordenada en Ratio, Moods y Rewind, y se retira `ReleaseHighlights`. Título, descripción y link preview alineados con el tagline nuevo; textos del Ratio y de las listas sin culpa por el backlog; se quita "lista de espera" del pedido de invitación y el bloque de invitación repetido de More features.
- Landing: i18n nativo de Astro con `locales: ["es", "en"]` y `prefixDefaultLocale`, páginas bajo `pages/[lang]/` y sitemap con alternativas por idioma.
- Landing (`nginx.conf`): `/` y las rutas viejas sin prefijo (`/privacy`, `/changelog`, `/gracias`) redirigen con 302 al idioma del visitante según `Accept-Language` (español si lo prefiere antes que el inglés, si no inglés), y el 404 sale en el idioma de la ruta.
- Landing: el `landing.pitch` de cada release pasa a tener `es` y `en` (`content.config.ts`), y todas las entradas existentes se completan en los dos idiomas. La skill `release-changelog-public` y `docs/rules.md` lo exigen.
- Landing: política de privacidad 2.7 (es y en), que explica que los tags de la comunidad cuentan de forma anónima.
- Help (web): explica los tags de la comunidad, los filtros por tags y los favoritos, y suma Tags a las secciones de privacidad.

## Fixed

- My Games (web): "Manage saved views" en el menú View no navegaba, porque `UiOptionPicker` ignoraba el `link` de la acción. Ahora es un enlace a `/saved-views` en el menú y en la hoja.
- Landing (`OpenSource`): cada lenguaje del repositorio tiene un color distinto y la barra separa los tramos.

## Migration

Cuatro migraciones nuevas en `apps/api/migrations/`:

- `20261118205100-add-tag-game-index-to-usergametags.js`: índice `("tag", "gameId")` en `UserGameTags` para las consultas por tag.
- `20261118205101-add-favoriteorder-to-moodtagmetas.js`: columna `favoriteOrder` en `MoodTagMetas`.
- `20261118205102-add-tagvisibility-to-users.js`: columna `tagVisibility` en `Users`, inicializada en las cuentas existentes con su `backlogVisibility`.
- `20261118234220-add-icon-and-color-to-moodtagmetas.js`: columnas `icon` y `color` en `MoodTagMetas`.

En producción se aplican con `npm run migrate:prod` antes de desplegar la API.

## Files of interest

- `apps/api/src/mood-tags/mood-tags.service.ts`
- `apps/api/src/mood-tags/mood-tags.routes.ts`
- `apps/api/src/common/constants/appearance.constants.ts`
- `apps/web/src/app/features/tags/`
- `apps/web/src/app/features/games/game-detail/components/game-tags.ts`
- `apps/web/src/app/shared/utils/inject-my-tag-filter.ts`
- `apps/web/src/app/features/backlog/backlog-list/view-url-state.ts`
- `apps/web/src/app/shared/ui/option-picker/ui-option-picker.html`
- `apps/landing/astro.config.mjs`
- `apps/landing/nginx.conf`
- `docs/rules.md` (tags de la comunidad, filtro `mood_tags`, vistas modificadas)

## Commits

- `b84a2799` — feat(landing): lead the hero with knowing what to play next instead of the 1.1 release
- `a9e84c5a` — feat(auth): replace the sign-in tagline with knowing what to play next
- `3bfd71c4` — feat(landing): add a mood tags section with a surprise me demo
- `b233420a` — feat(landing): give the rewind its own section with both story images
- `c559e3ee` — feat(landing): order the home around the ratio, moods and rewind and drop the 1.1 highlights
- `5113968b` — feat(landing): reword the ratio and lists copy away from backlog guilt
- `51c1fa5a` — feat(landing): align the page title, description and link preview with the new tagline
- `bf02429e` — feat(landing): drop waiting list wording from the invitation request
- `aff9d92e` — feat(landing): add an english link preview image
- `5f11ce37` — feat(landing): serve the landing in spanish and english with astro's native i18n
- `601bdcd1` — feat(landing): redirect unprefixed pages to the visitor's language in nginx
- `9c3e51ab` — docs(landing): document the bilingual landing and its language redirects
- `cc5df12b` — feat(landing): show each release summary in spanish and english
- `cd996268` — docs(changelogs): require the public release summary in both languages
- `271b3254` — fix(landing): give each repository language a distinct color
- `0555b364` — feat(landing): drop the redundant invitation block from more features
- `924a10a8` — feat(common): add a raw sql text search condition
- `74ad6cac` — test(common): cover the raw sql text search condition
- `80c21f26` — feat(games): expose active games with their ratio to other modules
- `dbf89603` — feat(users): add the tag visibility section
- `42c35bd1` — feat(mood-tags): add community tags, popular tags and favorite tags
- `39dc2c25` — feat(users): serve a user's favorite tags behind the tag section
- `6ae39638` — feat(backlog): filter the backlog by community tags
- `3e59546e` — feat(data-requests): export the favorite tag order and the tag visibility
- `c4ef29d4` — test(mood-tags): cover community tags and favorite tags with erratic users
- `422a200d` — test(users): cover the favorite tags endpoint and its section gate
- `91796f10` — test(backlog): cover the community tags filter
- `90bace92` — docs(api): document the community tags and favorite tags endpoints
- `96c38dd7` — docs(rules): explain the community tags threshold, read-time count and anonymity
- `0c9942e8` — feat(mood-tags): add community tag endpoints and a serialized tag list sync
- `f8a48f18` — feat(games): vote on community tags from the game detail
- `8c021c8d` — feat(tags): add a page with the games of a community tag
- `def902bb` — feat(tags): pick favorite tags and browse popular tags
- `88fa04b8` — feat(web): search community tags from the search palette
- `fe742a2a` — feat(backlog): suggest community tags when adding a game
- `d23f1093` — feat(settings): add tag visibility to privacy settings
- `434af39e` — feat(public-profile): show favorite tags on the public profile
- `619bec39` — feat(backlog): add popular tags request and tag filter params
- `4c4d04bb` — feat(backlog): add tag chip filter with my tags and community sources
- `abc84dda` — feat(backlog): filter my games by tag chips in the list and the filters panel
- `98419c06` — feat(backlog): add tags column to the hardcore table
- `b9023ea0` — refactor(web): move the tag service to core and share the tag helpers across features
- `92a1bd6e` — feat(landing): explain in the privacy policy that community tags count anonymously
- `8d52e41e` — feat(landing): mention community tags and tag search in the moods section
- `d96ab86e` — feat(help): explain community tags, tag filters and favorite tags
- `d73ce1dd` — test(settings): count twelve privacy sections in the section keys test
- `849be92d` — feat(help): add tags to the privacy sections and explain anonymous community tags
- `5ff431f8` — refactor(common): share the appearance icons and colors between saved views and tags
- `f4638e5b` — feat(mood-tags): let users give their tags an icon and a color
- `20c09185` — refactor(backlog): drop the community tags filter from the backlog api
- `d1599a60` — docs(rules): document tag icons and colors and drop the backlog community filter
- `d555e65c` — feat(ui): add a compact variant, option icons and a singular noun to the multi option picker
- `32d1c22e` — refactor(web): share the icon and color picker of saved views
- `221033d6` — feat(tags): pick an icon and a color for your tags and show them on tags and the profile
- `ad0e4024` — feat(backlog): filter my games by your own tags from the toolbar and show their icons
- `1585c3f1` — feat(ui): mark a modified selection in the option picker
- `d2ce989c` — feat(backlog): keep the active view when quick filters change and offer save to view and reset
- `564d22a8` — docs(rules): explain modified saved views and their url state
- `cd54c231` — feat(mood-tags): expose a reusable filter for games with all of a user's tags
- `fe40d969` — refactor(backlog): filter mood_tags with the shared mood-tags filter
- `4834d8f3` — feat(queue): filter up next and its export by mood_tags
- `18d7f670` — feat(game-shelf): filter my shelf and its export by mood_tags
- `1f6d7d73` — feat(wishlist): filter want to get and its export by mood_tags
- `2a72e2d7` — feat(favorites): filter favorites and their export by mood_tags
- `bdbfdaf7` — feat(game-platinum): filter my platinums and their export by mood_tags
- `721090e2` — test(mood-tags): cover the mood_tags filter on every own list and export
- `7b0844ff` — docs(api): document mood_tags on own lists and their exports
- `dd1fe06f` — docs(rules): explain the shared mood_tags filter of own lists
- `733236d3` — feat(tags): add a shared filter by your own tags that keeps mood_tags in the url
- `70fba7ba` — feat(queue): filter up next by your tags and reorder within the filter like a search
- `74976c2f` — feat(wishlist): filter want to get by your tags without dropping the known ids
- `d5178c5a` — feat(game-shelf): filter my shelf by your tags
- `210b198b` — feat(platinum): filter platinums by your tags
- `b77f031b` — feat(favorites): filter favorites by your tags and block reordering while filtered
- `081ad6b2` — feat(saved-filters): compute view stats with the applied backlog filters when they are sent
- `bbd99f91` — feat(ui): support link actions in the option picker menu and sheet
- `fb43878e` — feat(backlog): show the stats of a modified view with its applied filters and link manage saved views
- `91166d84` — docs(rules): explain stats of modified views and link actions in the option picker
- `d7e2d038` — refactor(backlog): use the shared tag filter and its helpers in my games
