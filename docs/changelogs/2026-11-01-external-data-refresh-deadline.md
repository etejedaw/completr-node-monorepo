# Plazo y prioridad del refresco individual de datos externos

**Released:** 2026-11-01

## Summary

`POST /games/:id/external-data/refresh` es síncrono, y en producción la API está detrás de un proxy que corta a los 60 s (nginx de CapRover) y de Cloudflare (100 s). Con el job `populate_external_data` o la cola de importación corriendo, el refresco individual esperaba detrás de ellos en la cola de cada host y, con reintentos, podía pasar ese límite: el admin veía un error genérico mientras el servidor seguía trabajando y guardaba datos después. Ahora el refresco individual tiene prioridad en `ScrapingHttpClient` y un plazo total de 45 s. Al vencer, se cancelan las requests en curso y se responde con lo que alcanzó a terminar, sin escrituras posteriores a la respuesta.

## Highlights

- Las requests interactivas pasan delante de las de fondo en la cola de cada host, sin cortar la que está en curso y respetando el throttle.
- Cancelación con `AbortSignal` en cola y en vuelo, con el código `<MOD>_ABORTED` en los providers.
- El refresco individual responde dentro de 45 s; una fuente sin terminar queda `failed` con `EXTERNAL_DATA_DEADLINE_EXCEEDED`.
- El diálogo de Admin → Games explica el plazo vencido en lugar de mostrar el código.

## Added

- `ScrapingRequestOptions` (`priority: "interactive" | "background"`, `signal`) en `getHtml` y `getText`. El valor por defecto es `"background"`.
- `utils/interruptible-sleep.util.ts`: espera que limpia su timer al abortarse.
- `HltbClient.getGameById`, `MetacriticClient.getGameBySlug` y `WikidataClient.findHltbCandidates` aceptan las opciones como segundo parámetro.
- Códigos `HLTB_ABORTED`, `METACRITIC_ABORTED` y `WIKIDATA_ABORTED` en las tres capas (HTTP 504, como `_TIMEOUT`).
- `EXTERNAL_DATA_REFRESH_DEADLINE_MS = 45_000` y `EXTERNAL_DATA_DEADLINE_EXCEEDED` en `games.constants.ts`. El plazo y el temporizador son inyectables con `registerExternalDataRefreshTimer`.
- `utils/until-aborted.util.ts`: rechaza en el acto al abortarse, aunque el provider ignore el signal, y descarta su respuesta tardía.
- `AdminExternalDataDialog`: texto propio para `EXTERNAL_DATA_DEADLINE_EXCEEDED`; el resto de los fallos siguen mostrando su código.

## Changed

- La cola por host de `ScrapingHttpClient` pasa de una cadena de promesas a una cola explícita (`HostQueue`) que se procesa en un bucle.
- Cada intento es un turno aparte: mientras espera su reintento, una request suelta el host. `Retry-After` y el backoff de un 429 siguen frenando a todo el host. El backoff de un 5xx, de un fallo de red o de un timeout ahora solo demora a esa request, y las de fondo que llegaron después pueden salir antes.
- `refreshGameExternalData` corre con prioridad interactiva y plazo, y comprueba el signal antes de cada escritura. El job y la cola de importación siguen en prioridad de fondo y sin plazo.
- `docs/context/providers.md`, `docs/invariants.md` y `docs/api/games/refresh-external-data.yml` documentan la prioridad, la cancelación, el plazo y el código nuevo.

## Files of interest

- `apps/api/src/scraping/scraping-http.client.ts`
- `apps/api/src/games/services/games-external-data.service.ts`
- `apps/api/src/games/utils/until-aborted.util.ts`
- `apps/web/src/app/features/admin/admin-external-data-dialog/admin-external-data-dialog.ts`

## Commits

- `f226cb8` — feat(scraping): add interactive priority and abort signal to scraping client
- `89b70ab` — feat(scraping): forward request options through providers and map aborted requests
- `7504ff7` — feat(games): bound single game external data refresh with a deadline
- `04e49ef` — test(scraping): cover request priority and cancellation in client and providers
- `fe0f9d2` — test(games): cover external data refresh deadline
- `06ca723` — docs(api): document scraping priority, cancellation and refresh deadline
- `fcf4083` — feat(admin): explain external data refreshes that ran out of time
