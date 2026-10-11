# Score del backlog limitado a 5

**Released:** 2026-10-11

## Summary

El `score` de un backlog se guarda en escala 0–5, pero el tope de 5 solo existía en el formulario del frontend. Los schemas de la API validaban `score` solo como positivo, así que cualquier cliente que no fuera el frontend (un script, Bruno, un seed) podía guardar una nota sin normalizar, como 88, que infla el ratio de esa entrada unas 20 veces. Ahora la API rechaza cualquier `score` mayor a 5.

## Fixed

- `POST /users/me/backlog` y `PATCH /users/me/backlog/:backlogId` responden 422 (`COMMON_SCHEMA_INVALID`) si `score` es mayor a 5. El límite inferior no cambia: tiene que ser positivo.

## Changed

- `docs/invariants.md` documenta que `score` va en escala 0–5 y que las notas de fuentes en otra escala se normalizan antes de enviarse.
- La colección de Bruno documenta el rango de `score` en create y update. En update se agregan `score` y `duration`, que faltaban, y se corrige el rango de `userRating` (0.5–5, no 1–10).

## Files of interest

- `apps/api/src/backlog/schemas/register-backlog.schema.ts` — validación al crear.
- `apps/api/src/backlog/schemas/update-backlog.schema.ts` — validación al editar.

## Commits

- `5ffdef0e` — fix(backlog): cap score at 5
