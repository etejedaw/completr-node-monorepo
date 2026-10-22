# Errores del módulo game-external

**Released:** 2026-10-22

## Summary

El módulo `game-external` definía errores de service y de dominio, pero no tenía mapper: un external id repetido llegaba al normalizer global como un servicio desconocido y la API respondía 500. Ahora sigue el mismo sistema de 3 capas que el resto de los módulos. De paso, el fallback del normalizer global usa el mismo mensaje que los normalizers de cada módulo.

## Added

- `game-external.service-to-domain.mapper.ts`, `game-external.error-domain.normalizer.ts` y `game-external.domain-to-http.mapper.ts`: `GAME_EXTERNAL_NOT_FOUND` → 404 y `GAME_EXTERNAL_UNIQUE_CONSTRAINT` → 409 `GAME_EXTERNAL_ALREADY_EXISTS`, con `GAME_EXTERNAL_INTERNAL_ERROR` como fallback.
- `apps/api/test/game-external/game-external.errors.unit.test.ts`.

## Changed

- `global-error-domain.normalizer.ts` enruta `Game External Service` y `global-error-http.normalizer.ts` enruta `Game External Module`.
- El fallback `COMMON` / `INTERNAL_ERROR` del normalizer global dice "Unexpected internal error" en lugar de "Unexpected error", igual que los normalizers de módulo.
- `docs/invariants.md` documenta los códigos de `game-external`.

## Fixed

- Un external id repetido para el mismo juego y fuente responde 409 en lugar de 500.

## Files of interest

- `apps/api/src/game-external/errors/`
- `apps/api/src/common/errors/global-error-domain.normalizer.ts`

## Commits

- `1b1e59eb` — fix(game-external): add error mappers for game external service errors
- `24226935` — fix(errors): route game external errors and align the internal error fallback message
- `456f0f4f` — docs(invariants): document game external error codes
