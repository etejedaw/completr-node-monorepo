# Tests de la integración con RAWG

**Released:** 2026-10-22

## Summary

La integración con RAWG, que era el único hueco de la suite de la API, queda cubierta sin salir a la red ni necesitar una key real. Los tests reemplazan el `fetch` global con `mock.method` de `node:test` y, como supertest corre la app en el mismo proceso, el mismo doble responde a las llamadas que hace la API. Los services crean el cliente RAWG al cargar el módulo, así que cada archivo de integración importa primero un setup que define una key falsa; node:test corre cada archivo en su propio proceso y el resto de la suite sigue viendo RAWG deshabilitado.

## Highlights

- Tests unitarios de `RawgClient.create`, `DisabledRawgProvider` y `RawgProvider`: URL construida, paginación, filtros, mapeo de la respuesta y errores.
- Tests de integración de `GET /games/rawg-lookup`, `GET /games/rawg-detail/:rawgId`, `GET /game-external/rawg/:slug`, el paso a RAWG de `GET /games/search` y `POST /admin/jobs/populate-rawg`.
- Con match local o `local_only`, la búsqueda afirma que no hubo ninguna llamada a RAWG.

## Added

- `apps/api/test/rawg/rawg-env.setup.ts`: key falsa, primer import de cada test de integración RAWG.
- `apps/api/test/rawg/rawg-fetch.helper.ts`: `stubRawgFetch` deja pasar lo que no va a `api.rawg.io` y registra las llamadas a RAWG; handlers de catálogo y de fallo.
- `apps/api/test/rawg/fixtures/rawg.fixtures.ts`: respuestas tipadas con `rawg.interface.ts`, compartidas por unitarios e integración.
- `apps/api/test/rawg/rawg-seed.helper.ts`: plataformas, géneros y la fuente de score que necesitan los imports.

## Changed

- `apps/api/test/admin/admin-games.integration.test.ts`: se quita un import sin uso que hacía fallar `npm run lint`.

## Files of interest

- `apps/api/test/rawg/rawg.provider.unit.test.ts`
- `apps/api/test/rawg/rawg-fetch.helper.ts`
- `apps/api/test/rawg/rawg-env.setup.ts`

## Commits

- `f03112e6` — test(rawg): cover RawgProvider, DisabledRawgProvider and RawgClient.create
- `2cae5c3b` — test(rawg): cover RAWG lookup, detail, search fallback and populate job endpoints
- `08730f3a` — test(admin): remove unused wishlist import
