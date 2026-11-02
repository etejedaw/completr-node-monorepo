# Errores al leer el body de la petición

**Released:** 2026-11-01

## Summary

Un body JSON malformado respondía 500 `INTERNAL_ERROR` en todas las rutas. `express.json()` corre antes que cualquier ruta, y el handler global no reconocía los errores de body-parser, así que caían en el fallback de error interno. Ahora `globalErrorDomainNormalizer` los identifica por su `type` y los convierte en errores de `Common Module`, que se aplican a todas las rutas y antes de la autenticación.

## Added

- `common/errors/body-parser-error.mapper.ts`: `entity.parse.failed` → `COMMON_INVALID_JSON` (400) y `entity.too.large` → `COMMON_PAYLOAD_TOO_LARGE` (413).
- Constructores `commonInvalidJson` y `commonPayloadTooLarge` en `common.domain-error.ts` y su status en `common.domain-to-http.mapper.ts`.
- Tests unitarios del mapper y del normalizer, y tests de integración (`test/common/request-body.integration.test.ts`): JSON truncado en una ruta autenticada, JSON roto antes del login, body por encima del límite del parser y body bien formado que sigue validándose contra el schema (422).

## Changed

- `docs/context/errors.md`: sección "Errores al leer el body".
- El test de JSON malformado de `POST /games/:id/external-data/refresh` deja de estar marcado como `todo` y comprueba `COMMON_INVALID_JSON`.

## Fixed

- Un body JSON malformado responde 400 en lugar de 500, y uno demasiado grande responde 413 en lugar de 500.

## Commits

- `932f0ad` — fix(api): answer 400 for malformed JSON bodies and 413 for oversized ones
- `544b946` — test(api): cover malformed and oversized request bodies
- `0c1a910` — docs(errors): document request body parsing errors
- `198bce6` — fix(test): register fakes in malformed json external data refresh test
