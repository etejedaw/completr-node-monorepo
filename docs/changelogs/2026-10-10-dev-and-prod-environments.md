# Entornos `dev` y `prod` unificados

**Released:** 2026-10-10

## Summary

Producción tenía tres nombres según el lugar: `prd` en `NODE_ENV`, `prod` en los scripts y `production` en el archivo de variables. Además, las migraciones solo tenían scripts para local. Ahora la API usa dos entornos con el mismo nombre en todas partes, `dev` y `prod`, cada uno con su archivo de variables y sus scripts de migración. Se elimina `stg`, que no existía.

## Changed

- `NODE_ENV` acepta `test`, `dev` y `prod`. El valor `prd` pasa a `prod` en el enum, en `error-handler.middleware.ts`, en `sequelize.database.ts` y en `database.migrate.js`.
- Scripts de `apps/api`: `migrate`, `migrate:undo` y `migrate:status` pasan a `migrate:dev`, `migrate:undo:dev` y `migrate:status:dev`, que leen `.env.dev.local` si existe y fijan `--env dev`.
- `start:dev` y `migrate:create` leen `.env.dev.local` en lugar de `.env`.
- `start:prod` lee `.env.prod.local` en lugar de `.env.production.local`.
- Scripts de la raíz: `migrate:dev`, `migrate:status:dev`, `migrate:prod` y `migrate:status:prod`.
- `README.md`, `docs/architecture.md`, `docs/context/errors.md` y la skill `db-migration` usan los nombres nuevos.

## Added

- `migrate:prod`, `migrate:undo:prod` y `migrate:status:prod` en `apps/api`. Exigen `apps/api/.env.prod.local` (fallan si no existe) y fijan `--env prod`.

## Removed

- Script `start:stg` y entorno `stg` de `database.migrate.js` y de `NODE_ENV`.

## Migration

- **Producción:** cambiar `NODE_ENV=prd` a `NODE_ENV=prod` en el deploy de la API junto con este cambio. Con `prd`, la validación de `environment.config.ts` falla y la API no arranca.
- **Desarrollo:** renombrar `apps/api/.env` a `apps/api/.env.dev.local` y `apps/api/.env.production.local` a `apps/api/.env.prod.local`.

## Files of interest

- `apps/api/package.json`: scripts `start:*` y `migrate:*`.
- `apps/api/src/common/config/database.migrate.js`: entornos de `sequelize-cli`.
- `apps/api/src/common/config/environment.config.ts`: valores válidos de `NODE_ENV`.

## Commits

- `f2c75f55` — chore(api): split migrate scripts into dev and prod and drop staging
- `addfda7a` — refactor(api): rename prd environment to prod
