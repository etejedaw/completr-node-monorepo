# Espera del Retry-After de Wikidata

**Released:** 2026-11-02

## Summary

El job "Fill missing Metacritic & HLTB" (`populate_external_data`) se detenía en producción con `WIKIDATA_RATE_LIMITED` a los pocos juegos. El servicio de consultas de Wikidata responde a veces 429 con `Retry-After: 120`, y `ScrapingHttpClient` solo reintenta si la espera no supera `maxRetryAfterMs`, que por defecto es de 60 s: ese 429 fallaba en el acto y el job, que se detiene ante cualquier error de throttle, terminaba en `failed`. El cliente de Wikidata ahora acepta esperas de hasta 5 minutos, así que espera los 120 s, reintenta y el job sigue.

## Changed

- `wikidata.provider.ts`: las opciones del `ScrapingHttpClient` propio de Wikidata pasan a `WIKIDATA_HTTP_OPTIONS` (exportada) y suman `maxRetryAfterMs: 300_000`. El throttle sigue en 1000 ms más un jitter de 0 a 500 ms.
- `docs/context/providers.md` (Provider de Wikidata) documenta el tope y su motivo.

## Fixed

- Un 429 de Wikidata con `Retry-After: 120` ya no detiene el job de datos externos: la request espera y se reintenta, y la siguiente request a Wikidata también espera. Un 429 que persiste tras el reintento, o un `Retry-After` de más de 5 minutos, sigue fallando como `WIKIDATA_RATE_LIMITED`.

## Files of interest

- `apps/api/src/wikidata/wikidata.provider.ts`
- `apps/api/test/wikidata/wikidata.provider.unit.test.ts`

## Commits

- `2f8633c5` — fix(wikidata): wait out the two-minute retry-after instead of stopping the job
- `72a80a15` — docs(api): document the wikidata retry-after cap
