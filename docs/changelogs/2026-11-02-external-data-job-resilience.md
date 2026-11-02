# Jobs más robustos: progreso, reinicios y límites de Wikidata

**Released:** 2026-11-02

## Summary

La primera corrida del job `populate_external_data` en producción se detuvo a los seis juegos con `WIKIDATA_RATE_LIMITED`, sin forma de saber qué había pedido Wikidata ni cuánto faltaba. Además, los jobs corren dentro del proceso de la API: un deploy a mitad de corrida dejaba el job en `running` para siempre y bloqueaba los siguientes de su tipo. Esta entrega cubre las tres cosas. Al arrancar, la API marca como fallidos los jobs que quedaron activos. El job de datos externos informa su avance mientras corre y el motivo de un corte incluye el status HTTP y el `Retry-After`. Wikidata, que solo resuelve ids de HowLongToBeat, deja de detener el job: en segundo plano se esperan sus pausas de hasta 10 minutos y, si sigue limitando, se pausa la búsqueda de ids por el resto de la corrida mientras Metacritic y los juegos con id conocido siguen avanzando.

## Highlights

- Admin → Jobs muestra `Running. Candidates: …, Processed: N, …` mientras el job de datos externos avanza.
- Un reinicio de la API ya no deja jobs colgados: pasan a `failed` con `Interrupted: the API restarted before the job finished`.
- Un límite de Wikidata pausa la búsqueda de ids de HLTB en vez de cortar todo el job.
- Los motivos de corte y de pausa dicen qué respondió el sitio: `WIKIDATA_RATE_LIMITED (HTTP 429, Retry-After 900 s)`.

## Added

- `failInterruptedJobs` en `jobs/jobs.service.ts`, llamado desde `app.ts` antes de escuchar.
- Progreso del job `populate_external_data`: el `result` se escribe con el prefijo `Running.` al encontrar los candidatos y después de cada juego, solo mientras el job sigue en `running`.
- `backgroundMaxRetryAfterMs` en `ScrapingHttpClient`: tope de `Retry-After` para las requests de fondo, separado del de las interactivas (`maxRetryAfterMs`). Por defecto 60 s; el cliente de Wikidata usa 10 minutos.
- `httpStatus` y `retryAfterSeconds` en los resultados `failed` de datos externos (`classifyExternalDataError`), también en la respuesta de `POST /games/:id/external-data/refresh`.
- Opción `resolveHltbId` de `refreshExternalDataForGame` y código interno `HLTB_ID_LOOKUP_PAUSED`.
- Warnings en el log al detener el job y al pausar la búsqueda de ids.

## Changed

- Los errores de Wikidata ya no detienen el job ni suman a la racha de `hltb`. `WIKIDATA_RATE_LIMITED`, `WIKIDATA_BLOCKED`, `WIKIDATA_PARSE_ERROR` o tres `WIKIDATA_TIMEOUT`/`WIKIDATA_REQUEST_ERROR` seguidos pausan la búsqueda de ids de HLTB; el `result` agrega `HLTB ID lookup paused: <motivo>, HLTB skipped without ID: N`.
- `docs/invariants.md`, `docs/context/providers.md` y la colección de Bruno (`jobs/populate-external-data.yml`, `games/refresh-external-data.yml`) documentan el progreso, los jobs interrumpidos, la pausa y el tope por prioridad.

## Files of interest

- `apps/api/src/jobs/jobs.service.ts`
- `apps/api/src/app.ts`
- `apps/api/src/scraping/scraping-http.client.ts`
- `apps/api/src/games/services/games-external-data.service.ts`
- `apps/api/src/games/utils/classify-external-data-error.util.ts`

## Commits

- `4275ce3b` — feat(jobs): fail interrupted jobs on startup and report external data progress
- `09f3b3c5` — docs(api): document interrupted jobs and external data job progress
- `cd6a4289` — feat(scraping): let background requests wait a longer retry-after and give wikidata ten minutes
- `ab0d571d` — feat(jobs): pause the hltb id lookup on wikidata failures and show http details in stop reasons
- `a90f5445` — docs(api): document wikidata pause, background retry-after cap and failure details
