# IGDB como fuente auxiliar de RAWG

**Released:** 2026-11-04

## Summary

La búsqueda de juegos dependía solo de RAWG. Cuando RAWG fallaba, la búsqueda devolvía una lista vacía y el usuario veía "No games found". Esta entrega integra IGDB en tres frentes:

- **Búsqueda online:** pasa a ser una cadena de fuentes (Chain of Responsibility en `games/services/online-search.handler.ts`). Primero responde RAWG y, solo si RAWG falla, IGDB. La respuesta dice si alguna fuente respondió y cuál fue.
- **Datos externos:** IGDB se suma como tercera fuente, junto a Metacritic y HowLongToBeat, para guardar su nota de usuarios.
- **Ficha del juego y fuentes:** la ficha enlaza a la página del juego en IGDB, y IGDB aparece en About, en el pie de atribución y en la política de privacidad.

El provider (`src/igdb`) sigue la estructura de `src/rawg`: interface, provider y tres capas de errores. El mapper `igdb-to-game` produce el mismo formato que `rawg-to-game`.

## Highlights

- Con RAWG caído, la búsqueda importa juegos desde IGDB con portada, fondo horizontal, plataformas (Switch 2 como plataforma propia), géneros y nota. La app avisa con "RAWG is down, showing results from IGDB" y el badge "New from IGDB".
- "Online search is unavailable" aparece solo si fallan RAWG e IGDB, en lugar de un "No games found" engañoso.
- La nota de usuarios de IGDB se refresca desde el admin, con el job `populate_external_data` y en la cola de enriquecimiento posterior a una importación.
- Sin credenciales de IGDB todo sigue funcionando: la cadena termina en RAWG y el job corre con Metacritic y HLTB.

## Added

- **Provider de IGDB** (`apps/api/src/igdb`):
    - `IgdbClient` con `searchGame`, `getGameById` y `getGameBySlug`, que hacen un POST Apicalypse a `/v4/games` con todos los campos en una sola request: cover, artworks, screenshots, plataformas, géneros, themes y `rating`.
    - `IgdbTokenClient` pide el token de Twitch con `client_credentials`, lo guarda en memoria, lo renueva 5 minutos antes de que venza y comparte un único pedido entre llamadas concurrentes. Ante un 401 invalida solo el token rechazado y reintenta una vez.
    - Errores `IGDB_*` en tres capas (`DISABLED` 503, `NOT_FOUND` 404, `RATE_LIMITED` 429, `AUTH_ERROR`, `REQUEST_ERROR` y `PARSE_ERROR` 502, `INTERNAL_ERROR` 500), registrados en los normalizers globales.
    - Variables opcionales `IGDB_CLIENT_ID` e `IGDB_CLIENT_SECRET`, con aviso al arrancar si falta alguna.
- **Mapper `igdb-to-game`** (`games/mappers`):
    - Portada en `coverUrl` (`t_cover_big_2x`).
    - Fondo en `backgroundUrl` (`t_1080p`): elige entre key art sin logo, artwork y key art con logo, y si no hay ninguno usa un screenshot. Solo toma imágenes con proporción entre 4:3 y 2:1.
    - Mapas de plataformas (`igdb-platform.map.ts`) y de géneros y themes (`igdb-genre.map.ts`), con slugs verificados contra la API.
    - Extractor de la nota (`igdb-score.extractors.ts`): `rating` crudo, en escala 0–100, redondeado a 2 decimales.
- **Migraciones:**
    - `add-igdb-score-source` siembra la fuente `igdb` en `ScoreSources` (escala 100, priority 5), así que la nota principal de los juegos no cambia.
    - `add-igdb-to-external-data-attempts-source` agrega `igdb` al enum de `ExternalDataAttempts`.
- **Datos externos:**
    - `igdb` en `EXTERNAL_DATA_SOURCES`.
    - `refreshIgdb` busca el juego por el id guardado, por slug, o por título y año (con margen de 1). Distingue ambiguo, no encontrado y sin nota.
    - Un limitador común (`create-request-pacer.util.ts`) deja al menos 275 ms entre peticiones a IGDB, que admite 4 por segundo.
    - IGDB solo se registra en `app.ts` si está habilitado. Metacritic y HLTB siguen siendo obligatorias para el job.
- **Búsqueda online:**
    - Clase base `OnlineSearchHandler` y los handlers `RawgSearchHandler` e `IgdbSearchHandler`.
    - IGDB descarta DLC, bundles, mods, episodes, seasons, forks, packs y updates, e importa hasta 3 juegos.
    - Los resultados con el mismo título quedan en un solo juego con un solo id de IGDB.
- **Front:**
    - Aviso de búsqueda no disponible, nota `app-online-source-note` y badges por fuente en Browse, en los diálogos de búsqueda (My Games, My Shelf, Want to Get, Platinums) y al agregar juegos a una lista.
    - Opción "IGDB — user score" en el diálogo de datos externos del admin.
    - IGDB en About y en el pie de atribución.
    - En la ficha del juego, enlace a IGDB con su URL corta (`https://www.igdb.com/g/<id en base 36>`), porque igdb.com no enlaza por id numérico.

## Changed

- **`GET /games/search`:**
    - Responde `onlineSearchAvailable`, y cuando es `true` también `onlineSearchSource` (`rawg` o `igdb`). Los dos vienen solo cuando la búsqueda va online.
    - El parámetro `force_rawg` pasa a `force_online`.
    - Los fallos de las fuentes ya no llegan como error HTTP, tampoco en la búsqueda forzada: si fallan todas, la respuesta es 200 con lista vacía.
- **Front:**
    - "Search RAWG" pasa a "Search online" en todos los textos de búsqueda.
    - El interceptor vuelve a mostrar el toast de 429 siempre.
- **Política de privacidad 2.3:** IGDB entra en la lista de catálogos externos. Además, la política aclara que las portadas y los fondos se descargan directo de los servidores de imágenes de RAWG e IGDB, que ven la IP y el navegador pero no reciben ningún otro dato.

## Fixed

- La CSP del front (`security-headers.conf`) y el service worker (`ngsw-config.json`) permiten y guardan en cache las imágenes de `images.igdb.com`. Sin ese cambio, el navegador las habría bloqueado en producción.
- `admin-games.interaction.spec` fallaba de forma intermitente bajo la carga de la suite completa: `untilVisible` espera ahora hasta 5 s.

## Migration

- Aplicar las dos migraciones con `npm run migrate:prod`.
- Configurar `IGDB_CLIENT_ID` e `IGDB_CLIENT_SECRET` en la API (CapRover).
- Los clientes de `GET /games/search` tienen que usar `force_online` en lugar de `force_rawg` y dejar de esperar errores `RAWG_*` en la búsqueda.

## Files of interest

- `apps/api/src/igdb/igdb.provider.ts`, `apps/api/src/igdb/igdb-token.client.ts`, `apps/api/src/igdb/igdb.interface.ts`
- `apps/api/src/games/services/online-search.handler.ts`, `rawg-search.handler.ts`, `igdb-search.handler.ts`
- `apps/api/src/games/mappers/igdb-to-game.mapper.ts`
- `apps/api/src/games/services/games-external-data.service.ts`
- `apps/web/src/app/features/games/game-search.ts`, `apps/web/src/app/shared/components/game-search/game-search-step.html`
- `apps/web/security-headers.conf`, `apps/web/ngsw-config.json`

## Commits

- `16e8ce49` — feat(games): report rawg availability in game search
- `d97c1cbf` — test(games): cover rawg availability in game search
- `ed940cc0` — feat(games): track rawg outages in the frontend game search
- `1dfa1eee` — feat(games): show a rawg unavailable notice instead of an empty search
- `318c3172` — test(games): cover the rawg unavailable notice and retry
- `1704ebd7` — docs(api): document rawgAvailable in game search
- `fb578127` — feat(igdb): add the igdb game response contract
- `af81dec2` — feat(igdb): add igdb error layers and register them in the global normalizers
- `7f38bad5` — feat(igdb): add the twitch token client with shared renewal
- `571a9724` — feat(igdb): add the igdb provider with search and lookup by id or slug
- `522997a3` — feat(igdb): add optional igdb credentials and a startup warning
- `834c9f32` — test(igdb): cover the igdb provider, token client and error layers
- `a40eafdc` — docs(igdb): document the igdb provider, its config and error codes
- `1e38c34d` — feat(games): add the igdb to game mapper
- `64dfe4ab` — feat(games): add the igdb score source migration
- `954a8579` — test(games): cover the igdb to game mapper
- `9bfe0ea1` — feat(games): add igdb to the external data refresh dialog
- `a5bd691d` — test(games): cover igdb in the external data refresh dialog
- `2b8b2175` — feat(web): list igdb as a data source in about and the footer
- `f033bebc` — docs(landing): mention igdb in the privacy policy data sources
- `e5b4d47e` — feat(external-data-attempts): add igdb to the attempt sources
- `3440f21c` — feat(games): add a request pacer for external data sources
- `1db841bd` — feat(games): refresh the igdb rating as optional external data
- `ce69423b` — test(games): cover the igdb external data source
- `c15f14cf` — test(jobs): include igdb in the populate external data job tests
- `4c2b10cd` — docs(invariants): document igdb as an external data source
- `53e80136` — docs(api): document igdb in the external data refresh and job
- `5cfcc303` — feat(igdb): register igdb as an external data source when enabled
- `bdbf058c` — refactor(games): share the igdb user rating extractor with external data
- `eedfc39b` — docs(invariants): document the igdb score source seed
- `29179729` — docs(landing): publish privacy policy 2.3 with external game image servers
- `15da8258` — fix(web): allow and cache igdb images in the csp and service worker
- `4b9b9201` — feat(igdb): request artworks and screenshots in game lookups
- `1a42a123` — feat(games): pick a horizontal igdb background for mapped games
- `79c632dd` — test(games): cover the igdb background choice and image fields
- `ebeab5f1` — docs(igdb): list the image fields requested from igdb
- `737a9ce8` — feat(games): add the online search chain with rawg and igdb handlers
- `14cdfaea` — feat(games): fall back to igdb when the rawg search fails
- `05c426e6` — style(games): sort the external data sources imports
- `66b9ec2e` — test(games): cover the igdb fallback of the online search
- `baeec302` — docs(api): document the online search chain and its response fields
- `a6841346` — feat(games): read the online search availability and source in the frontend
- `3c8d6f11` — feat(games): show the igdb fallback note and source badges in game search
- `c4b9b267` — test(games): cover the online search states in the frontend
- `7a4d8d9e` — test(admin): give the admin games interaction waits room under load
- `ee853509` — test(games): check only user queries when rawg answers the online search
- `0abda04b` — style(games): sort imports in the igdb external data tests
- `5e8f46f4` — feat(games): link to the igdb page with its short url in game detail
- `23f86a72` — test(games): cover the igdb link in game detail
