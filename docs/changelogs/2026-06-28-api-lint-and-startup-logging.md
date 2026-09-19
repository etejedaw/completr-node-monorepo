# Reglas de lint y logging de arranque del backend

**Released:** 2026-06-28

## Summary

El backend endurece su configuración de ESLint y aplica las reglas nuevas en todo el código. En la misma tanda, el arranque deja de usar `console` y usa el logger pino. La conexión a la base se autentica y se registra al iniciar, así que una base inaccesible se detecta en el arranque y no en la primera query.

## Added

- Reglas `curly`, `simple-import-sort`, `consistent-type-imports`, `no-console`, `eqeqeq` estricto y reglas de promesas.
- `init.database` autentica la conexión y la registra al arrancar.

## Changed

- Llaves obligatorias, imports ordenados y type imports inline en todo `apps/api/src`.
- `backlog` usa igualdad estricta.
- El bootstrap (`server.ts`, `sequelize.database.ts`) registra con pino en lugar de `console`.

## Fixed

- `activity.record` es seguro como fire-and-forget: un fallo al registrar la actividad ya no queda como promesa rechazada sin manejar.

## Files of interest

- `eslint.config.mjs`
- `apps/api/src/database/init.database.ts`
- `apps/api/src/activity/activity.service.ts`

## Commits

- `89e835f0` — build(eslint): add curly and import-sort rules
- `c18976a9` — style: enforce curly braces and sort imports
- `7e7c64b9` — build(eslint): add type-imports and no-console rules
- `88057863` — style: enforce inline type imports
- `e4999136` — build(eslint): enforce strict eqeqeq and promise rules
- `00423bde` — refactor(backlog): use strict equality checks
- `96180363` — fix(activity): make record fire-and-forget safe
- `30f0086c` — refactor(logging): replace console with pino logger in bootstrap
- `f929556b` — feat(database): authenticate and log connection on startup
