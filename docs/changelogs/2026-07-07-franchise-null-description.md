# Franchise create acepta description null

**Released:** 2026-07-07

## Summary

Al crear una franquicia desde el panel de admin sin descripción, el frontend envía `description: null` y el backend lo rechazaba con `422 COMMON_SCHEMA_INVALID`. El `RegisterFranchiseSchema` marcaba `description` como `.optional()` (solo acepta `undefined`), mientras que el `UpdateFranchiseSchema` ya usaba `.nullish()`. Se alinea el schema de creación con el de actualización para aceptar `null` además de `undefined`. El modelo `Franchise` ya permitía `null` en la columna `description`, así que no hubo cambio de esquema en base de datos.

## Fixed

- `POST /franchises` acepta `description: null` sin fallar la validación; se persiste como `null`.

## Changed

- `RegisterFranchiseSchema`: `description` pasa de `.optional()` a `.nullish()`, consistente con `UpdateFranchiseSchema`.
- Doc Bruno de `Create Franchise`: el campo `description` se documenta como `string / null`.

## Files of interest

- `src/franchises/schemas/register-franchise.schema.ts`
- `docs/api/franchises/create.yml`

## Commits

- `0063ae1` — fix(franchises): accept null description on create
- `a08b108` — docs(api): note nullable description on create franchise
