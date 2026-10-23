# Manejo de errores de RAWG

**Released:** 2026-10-22

## Summary

Los tests de RAWG mostraron fallos que la API escondía o devolvía como error interno. El provider ahora traduce todo lo que puede fallar en una llamada a RAWG a un `ServiceError` de la cadena de errores. El job `populate_rawg` distingue un juego que RAWG no conoce de un RAWG caído, y la búsqueda forzada en RAWG informa el fallo en lugar de responder una lista vacía.

## Highlights

- Una caída de red responde 502 `RAWG_REQUEST_ERROR` y un cuerpo que no es JSON, 502 `RAWG_PARSE_ERROR`. Antes respondían 500 `INTERNAL_ERROR`.
- `populate_rawg` sigue ante un 404 y se detiene en `failed` ante cualquier otro fallo, con el motivo en `result`.
- `GET /games/search?force_rawg=true` propaga los fallos de RAWG y la web avisa al usuario.

## Changed

- `RawgProvider` (`apps/api/src/rawg/rawg.provider.ts`): las tres llamadas pasan por un `request` privado que envuelve el fallo de `fetch` en `requestError` y el JSON inválido en `parseError`.
- `DisabledRawgProvider`: los métodos devuelven una promesa rechazada con `RAWG_DISABLED` en lugar de lanzar de forma síncrona.
- `runPopulateRawg` (`apps/api/src/jobs/jobs.service.ts`): `RAWG_NOT_FOUND` suma a los no encontrados y el job continúa. Cualquier otro error lo detiene en `failed`. El `result` cambia "Errors" por "Not found" y, al fallar, incluye el motivo.
- `searchAndCreateFromRawg` (`apps/api/src/games/games.service.ts`): con `force_rawg=true`, el fallo de la búsqueda en RAWG se relanza (429 `RAWG_RATE_LIMITED`, 502 `RAWG_REQUEST_ERROR` / `RAWG_PARSE_ERROR`). El fallback implícito sigue respondiendo 200 con lista vacía.
- `GamesService.search` (`apps/web/src/app/features/games/games.ts`): cuando falla la búsqueda forzada se muestra un toast. Con 429 no se muestra, porque ya avisa `errorInterceptor`.
- Bruno: `rawg-lookup.yml` documenta `backgroundUrl` (no `coverUrl`), `get-rawg-by-slug.yml` se alinea con la respuesta real, y `rawg-detail.yml`, `search.yml` y `populate-rawg.yml` documentan los errores y el formato de `result`.
- `docs/invariants.md`: cuándo sale cada código de RAWG, la propagación de `force_rawg` y las reglas de fallo de `populate_rawg`.
- `docs/context/providers.md`: el ejemplo del provider refleja el manejo de red y de parseo.

## Fixed

- Los fallos de red y de parseo de RAWG ya no responden 500.
- `populate_rawg` ya no termina `completed` cuando RAWG no está disponible.

## Files of interest

- `apps/api/src/rawg/rawg.provider.ts`
- `apps/api/src/jobs/jobs.service.ts`
- `apps/api/src/games/games.service.ts`
- `apps/web/src/app/features/games/games.ts`

## Commits

- `7f5b8b9e` — fix(rawg): map network and parse failures to service errors and reject disabled provider calls
- `0c7830af` — docs(api): align rawg endpoints responses and errors with the real behavior
- `3dec238a` — docs(invariants): document rawg error causes and disabled provider rejection
- `780252ff` — fix(jobs): fail populate-rawg on systemic RAWG errors and count not found separately
- `87763a28` — fix(games): propagate RAWG search failures when force_rawg is set
- `1215f02c` — feat(web): warn when the forced online game search fails
- `6f539cb8` — docs(invariants): document force_rawg error propagation and populate-rawg failure rules
- `bf91e635` — docs(providers): update rawg provider example with network and parse error handling
- `81d9eabb` — test(rawg): expect wrapped request error when the network fails during populate-rawg
