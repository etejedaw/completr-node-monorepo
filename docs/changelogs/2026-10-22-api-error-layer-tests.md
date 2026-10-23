# Tests de la capa de errores y de services con poca cobertura

**Released:** 2026-10-22

## Summary

La capa de errores de la API (service → domain → http) pasa a tener tests unitarios en todos los módulos, en lugar de depender de que la suite de integración provoque cada error de la base. Se suman tests de `games-profile.service` y de `cached-json-proxy`, los dos archivos con lógica que quedaban con menos cobertura. No hay cambios en `src/`.

## Highlights

- Cada mapper service-to-domain, normalizer y mapper domain-to-http se prueba con tablas: código de entrada, error de dominio o status esperado, y el fallback.
- El normalizer global prueba el enrutamiento de los 27 servicios, incluidos auth e invitations, que la suite nunca ejecutaba.
- `cached-json-proxy` cubre cache, TTL, peticiones concurrentes y los fallos de la fuente con y sin cache previa.

## Added

- `apps/api/test/unit-helpers/error-layers.ts`: `describeModuleErrors`, `describeDomainToHttpMapper` y `assertCommonInternalError`.
- `apps/api/test/<módulo>/<módulo>.errors.unit.test.ts` para cada módulo con capa de errores, más `auth` y `activity`.
- `apps/api/test/games/games-profile.service.unit.test.ts`: listas del juego, actividad de amigos y jugadores.
- `apps/api/test/common/cached-json-proxy.util.unit.test.ts`, con `fetch` simulado y `mock.timers`.

## Changed

- `apps/api/test/common/errors/global-error-domain.normalizer.unit.test.ts` suma el enrutamiento de todos los servicios.

## Files of interest

- `apps/api/test/unit-helpers/error-layers.ts`
- `apps/api/test/common/errors/global-error-domain.normalizer.unit.test.ts`
- `apps/api/test/common/cached-json-proxy.util.unit.test.ts`

## Commits

- `f330f120` — test(api): add unit tests for the error mappers and normalizers
- `c655cf84` — test(common): add cached json proxy unit tests
- `791a12a4` — test(games): add games profile service unit tests
