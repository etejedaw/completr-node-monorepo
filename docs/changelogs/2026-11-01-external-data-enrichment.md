# Enriquecimiento del catálogo con Metacritic y HowLongToBeat

**Released:** 2026-11-01

## Summary

El catálogo puede completar el score de Metacritic y la duración de HowLongToBeat de cada juego leyendo las páginas públicas de esas fuentes. Los providers (`apps/api/src/metacritic/`, `apps/api/src/hltb/`) solo hacen transporte y parsing de páginas de detalle: se respeta el robots.txt de ambos sitios, que prohíbe sus buscadores (`/search` en Metacritic, `/api` en HowLongToBeat), así que nunca se consultan. El emparejamiento vive en un orquestador de `games`. Metacritic deriva el slug del título y exige que coincidan título y año. HowLongToBeat necesita un ID ya guardado, que se resuelve con Wikidata (por el slug de RAWG o por título exacto y año) o que carga un admin desde el editor. El mismo orquestador se usa en tres flujos: un refresco individual síncrono, un job masivo y una cola en segundo plano para los juegos que la búsqueda importa desde RAWG. Todas las requests pasan por un cliente HTTP compartido con throttle por host, así que el job y las acciones individuales comparten el mismo ritmo.

## Highlights

- Refresco por juego desde Admin → Games: un diálogo para elegir las fuentes, con resultado por fuente (`updated`, `not_found`, `ambiguous`, `no_data`, `failed`).
- Job `populate_external_data` en Admin → Jobs que completa solo los datos ausentes del catálogo, con cancelación y detención ante bloqueos.
- Resolución automática del ID de HowLongToBeat vía Wikidata y carga manual del ID de HLTB y del slug de Metacritic en el editor.
- Los juegos importados desde RAWG en la búsqueda se enriquecen en segundo plano, sin demorar la respuesta.

## Added

- Módulo `apps/api/src/scraping/`: `ScrapingHttpClient`, con una request a la vez por host, delay configurable (5000 ms + jitter de 0 a 2000 ms por defecto), timeout de 15 s, un reintento ante 429, 5xx, timeout o fallo de red, respeto de `Retry-After` con un tope de 60 s y `BLOCKED` sin reintento ante 403, CAPTCHA o páginas de challenge. User-Agent `CompletrBot/1.0 (+https://www.completr.app)`. Reloj, espera, aleatoriedad y `fetch` inyectables.
- Provider `HltbClient` (`getGameById`): lee `__NEXT_DATA__` de `/game/<id>` y devuelve Main Story, Main + Extras y Completionist en horas.
- Provider `MetacriticClient` (`getGameBySlug`): lee el JSON-LD y el hero de `/game/<slug>/` y devuelve el Metascore y el User Score crudos, el año, las plataformas y el slug canónico.
- Provider `WikidataClient` (`findHltbCandidates`): una consulta SPARQL por P9968 (slug de RAWG) o por etiqueta en inglés, con P2816 (ID de HowLongToBeat) y P577. Tiene un throttle propio (1000 ms + jitter de 0 a 500 ms) y escapa los literales.
- Errores en tres capas con prefijos `HLTB_`, `METACRITIC_` y `WIKIDATA_` (`NOT_FOUND`, `PARSE_ERROR`, `RATE_LIMITED`, `BLOCKED`, `TIMEOUT`, `REQUEST_ERROR`), registrados en los normalizers globales. Se agrega `GAME_EXTERNAL_DATA_SOURCE_UNAVAILABLE` (503).
- Orquestador `games-external-data.service.ts` con un registro de fuentes inyectable (`external-data-sources.service.ts`), cableado con los providers reales en `apps/api/src/app.ts`.
- `POST /games/:id/external-data/refresh` (moderador o admin): `sources` es obligatorio, sin duplicados y limitado a `metacritic` y `hltb`. Devuelve el juego actualizado y un resultado por fuente, y registra la acción de auditoría `game_external_data_refreshed`.
- `POST /admin/jobs/populate-external-data?limit=` (job `populate_external_data`): selecciona los juegos activos a los que les falta Metacritic o HLTB y consulta solo las fuentes ausentes. Se detiene ante `RATE_LIMITED`, `BLOCKED` o `PARSE_ERROR`, o tras 3 fallos transitorios seguidos de una misma fuente. El `result` es legible, con contadores por fuente.
- Cola `games-import-enrichment.service.ts`: `searchGames` encola los juegos que acaba de importar desde RAWG, y un procesador secuencial les pide los datos ausentes. Deduplica, tiene un tope de 50 y, ante un throttle o bloqueo, vacía la cola y se pausa 10 minutos. Vive en memoria.
- Web: `AdminExternalDataDialog`, botón `cloud_sync` por fila en Admin → Games, acción `Fill missing Metacritic & HLTB` en Admin → Jobs, `refreshExternalData` en `GamesService`, `startPopulateExternalData` en `JobsService` y la acción de auditoría nueva en el filtro de Admin → Audit.
- Editor de juegos: campos "HowLongToBeat ID" y "Metacritic slug" que aceptan la URL pegada (también las antiguas de Metacritic con plataforma), validación inline, enlace "Search on HowLongToBeat" (abre la búsqueda en el navegador del admin) y "Open on Metacritic". Solo se envía lo que cambió, y vaciar un campo no borra el ID guardado.
- Dependencia `cheerio` en `apps/api`.
- Colección Bruno: `docs/api/games/refresh-external-data.yml` y `docs/api/jobs/populate-external-data.yml`.

## Changed

- `ScrapingHttpClient.getText` admite headers propios; `getHtml` delega en él.
- `game-scores` y `game-times` exponen `findGameIdsBySource`.
- `jobs/job-id-params.schema.ts` pasa a `jobs/schemas/`.
- `UiCheckbox` se nombra por su `label` (`aria-label`) y la fila completa lo marca, así que todo su alto es objetivo táctil.
- `docs/context/providers.md`, `docs/invariants.md` y `docs/architecture.md` describen los providers, la regla de score de Metacritic (el mayor entre el Metascore y el User Score ×10), Main Story de HLTB sin sustituciones, la resolución vía Wikidata, el job y la cola.

## Fixed

- La columna de acciones de Admin → Games se cortaba a 1024 px con la barra lateral abierta y escondía los botones de la derecha. Se bajaron los mínimos de las columnas flexibles de la rejilla.

## Files of interest

- `apps/api/src/scraping/scraping-http.client.ts`
- `apps/api/src/hltb/hltb.provider.ts`, `apps/api/src/metacritic/metacritic.provider.ts`, `apps/api/src/wikidata/wikidata.provider.ts`
- `apps/api/src/games/services/games-external-data.service.ts`
- `apps/api/src/games/services/games-import-enrichment.service.ts`
- `apps/api/src/games/utils/resolve-hltb-id.util.ts`, `apps/api/src/games/utils/pick-metacritic-score.util.ts`
- `apps/api/src/jobs/jobs.service.ts`
- `apps/web/src/app/features/admin/admin-external-data-dialog/admin-external-data-dialog.ts`
- `apps/web/src/app/features/games/admin-game-editor/external-id-input.ts`

## Commits

- `ea4795d` — chore(deps): add cheerio to the api
- `5103a3d` — feat(scraping): add shared http client with per-host throttle and retries
- `835d298` — feat(hltb): add howlongtobeat detail page provider
- `2b954b3` — feat(metacritic): add metacritic detail page provider
- `6fe02b1` — feat(api): register scraping provider errors in global normalizers
- `fccbbd0` — docs(providers): document scraping providers and shared throttle
- `921a566` — test(metacritic): match score label attributes regardless of formatting
- `4e7c623` — feat(game-scores): list game ids that have a score or time from a source
- `84e1bea` — feat(games): add metacritic slug, title matching and score rules
- `e34e14e` — feat(games): add external data source unavailable error
- `fd7ab36` — feat(games): add external data enrichment orchestrator with injectable sources
- `7a7a20d` — feat(games): add external data refresh endpoint
- `2bbd046` — feat(jobs): add populate external data job
- `dd33a5d` — docs(api): document external data refresh endpoint and job
- `69c4192` — docs: document external data enrichment invariants
- `b21ffd1` — fix(ui): name checkbox by its label and toggle it from the whole row
- `aaea39c` — feat(games): add external data refresh request to games service
- `aa0029e` — feat(admin): add fill missing metacritic and hltb job action
- `dec7136` — feat(admin): refresh external data of a game from admin games
- `946a342` — feat(admin): add external data refresh action to audit filters
- `691fdb7` — feat(api): register scraping providers as external data sources at startup
- `27ace0b` — fix(admin): fit admin games columns on narrow desktop widths
- `4a998e2` — feat(scraping): allow custom request headers in scraping http client
- `63575ec` — feat(wikidata): add wikidata provider to find hltb id candidates
- `45d2b05` — feat(games): resolve missing hltb ids through wikidata
- `99b739a` — docs(api): document wikidata provider and hltb id resolution
- `422a6d5` — feat(admin): edit hltb id and metacritic slug from the game editor
- `0b84448` — feat(admin): point external data refresh misses to the game editor
- `3f0366c` — refactor(games): share external data throttle suffixes and per-game missing sources
- `d872fbf` — feat(games): enrich games imported from rawg search in a background queue
- `9813fa5` — test(games): cover import enrichment queue and search hook
- `4c896a6` — docs(api): document import enrichment queue
