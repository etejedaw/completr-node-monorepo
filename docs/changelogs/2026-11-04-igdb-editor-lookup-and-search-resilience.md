# Lookup de IGDB en el editor y búsqueda más resistente

**Released:** 2026-11-04

## Summary

Segunda entrega de la integración de IGDB, después de `2026-11-04-igdb-auxiliary-source`. El editor de juegos del admin permite elegir RAWG o IGDB al traer los datos de un juego por slug. La búsqueda online deja de esperar ~20 s cuando RAWG está caído: las requests a las fuentes tienen timeout y la cadena recuerda unos minutos que RAWG falló. Además, el scraping trata el 410 de Metacritic como "no encontrado", y los logs de producción rotan y también salen por la salida estándar.

## Highlights

- Selector RAWG | IGDB en el lookup del editor de juegos, con la portada de IGDB incluida al guardar.
- Con RAWG caído, las búsquedas online tardan alrededor de 1 s en vez de ~21 s.
- Metacritic ya no deja juegos en `failed` ni corta la búsqueda de slugs cuando responde 410.
- Los logs de producción rotan por día o por tamaño y se ven en el visor de CapRover.

## Added

- `GET /game-external/igdb/:slug` (solo moderadores): trae un juego de IGDB por slug sin importarlo y pasa por el limitador común de IGDB. Sin credenciales responde 503 `IGDB_DISABLED`.
- Selector de fuente en el editor de juegos (`admin-game-editor`, con `app-segmented-control`). El placeholder, el error y el badge del id cambian según la fuente. Errores: 404 "Game not found on …", 503 "… is not available right now" y el resto "Couldn't reach … right now". Al guardar se manda el `externalId` de la fuente consultada y, con IGDB, también `coverUrl`.
- Timeout de 5 s (`AbortSignal.timeout`) en las requests a RAWG, a IGDB y al token de Twitch, también durante la lectura del cuerpo. Se reporta como `RAWG_REQUEST_ERROR` o `IGDB_REQUEST_ERROR` con el mensaje "timed out after 5000 ms". La detección vive en `common/utils/is-timeout-error.util.ts`.
- Memoria de fallos en la cadena de búsqueda online (`OnlineSearchHandler`): cuando RAWG falla, las búsquedas lo saltan durante 2 minutos (`RAWG_UNAVAILABLE_COOLDOWN_MS`) y van directo a IGDB. Una respuesta exitosa de RAWG borra el fallo. En el entorno `test` el plazo es 0.
- `pino-roll` en la API. En producción los logs van a `<cwd>/logs/` con un archivo nuevo por día o cada 10 MB, se guardan 7 anteriores y hay un `current.log` que apunta al activo. Al mismo tiempo van a la salida estándar.

## Changed

- `GET /game-external/rawg/:slug` responde el mismo shape que el de IGDB: `source`, `externalId`, `coverUrl` (siempre `null` en RAWG) y `backgroundUrl` (el arte de RAWG), en lugar de `rawgId` y `coverUrl`. El schema de params pasa a `external-slug-params.schema.ts`.
- El cliente de scraping (`scraping-http.client.ts`) trata 404 y 410 como `NOT_FOUND`. Metacritic responde 410 para los slugs que no existen; antes eso era `REQUEST_ERROR`, cortaba la prueba de candidatos y podía frenar el job `populate_external_data`.

## Removed

- `GET /games/rawg-lookup` y `GET /games/rawg-detail/:rawgId`, que no usaba nadie, junto con `rawg-id-params.schema.ts`, sus tests y sus documentos de Bruno.

## Migration

- La API y el front tienen que salir en el mismo deploy, porque cambió la respuesta de `GET /game-external/rawg/:slug`.
- Para que los logs sobrevivan a los deploys, montar `/usr/app/logs` como volumen en CapRover (Service Update Override con `ContainerSpec.Mounts`). El `app.log` de versiones anteriores queda huérfano y se puede borrar.

## Files of interest

- `apps/api/src/games/services/online-search.handler.ts`
- `apps/api/src/games/services/games-search.service.ts`
- `apps/api/src/rawg/rawg.provider.ts`, `apps/api/src/igdb/igdb.provider.ts`, `apps/api/src/igdb/igdb-token.client.ts`
- `apps/api/src/scraping/scraping-http.client.ts`
- `apps/api/src/common/logger/pino.config.ts`
- `apps/web/src/app/features/games/admin-game-editor/admin-game-editor.ts`

## Commits

- `eada00d5` — refactor(games): remove the unused rawg lookup and detail endpoints
- `afc98a8b` — feat(game-external): look up a game by slug on rawg or igdb with one detail shape
- `d096fd07` — test(game-external): cover the igdb slug lookup and drop the removed rawg endpoints
- `1afbb6c6` — docs(api): document the rawg and igdb slug lookups
- `92f3c5f7` — feat(games): fetch an external game by slug from rawg or igdb
- `d871f360` — feat(games): let moderators pick rawg or igdb in the game editor lookup
- `458c2ed1` — test(games): cover the rawg and igdb lookup in the game editor
- `f5f1d7f4` — feat(api): time out rawg, igdb and twitch requests after 5 seconds
- `1791d33a` — feat(games): skip rawg in the online search for 2 minutes after it fails
- `03400db9` — test(games): cover request timeouts and the online search cooldown
- `fac8ebf7` — docs(api): document request timeouts and the rawg cooldown
- `58d31dca` — fix(scraping): treat 410 gone pages as not found
- `f10f3286` — test(scraping): cover 410 gone pages as not found
- `bd2a79fb` — docs(api): note that scraping treats 410 as not found
- `b19dbd44` — build(api): add pino-roll for log rotation
- `f74305cc` — feat(api): rotate production logs and mirror them to stdout
- `faa55179` — docs(api): document where the api writes its logs
