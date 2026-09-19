# Variables de entorno y migraciones sin `.env`

**Released:** 2026-09-19

## Summary

La API arrancaba sin `apps/api/.env` porque sus valores por defecto viven en el código, pero los scripts `migrate*` exigían ese archivo con `--env-file=.env` y fallaban antes de conectarse. Además, `.env.example` no listaba `CHANGELOG_SOURCE_URL`, y el README indicaba copiarlo tal cual, lo que deja keys vacías que no toman el valor por defecto. Ahora las migraciones corren sin `.env`, el ejemplo lista todas las keys y el README deja el `.env` como opcional.

## Changed

- Scripts `migrate`, `migrate:undo`, `migrate:create` y `migrate:status` de `apps/api` usan `--env-file-if-exists=.env`.
- `.sequelizerc` usa `NODE_ENV=dev` cuando no viene definido. Antes `sequelize-cli` buscaba el entorno `development`, que no existe en `database.migrate.js`.
- `apps/api/.env.example` lista todas las keys que lee la API, sin valores. Suma `CHANGELOG_SOURCE_URL`.
- `README.md`: el `.env` es opcional en desarrollo. `.env.example` sirve de referencia de keys y no se copia tal cual; `RAWG_API_KEY` es la única que conviene definir.

## Migration

- **Desarrollo:** si tu `apps/api/.env` se creó copiando `.env.example`, borra las keys vacías o borra el archivo. Una key vacía llega a la API como string vacío y no toma el valor por defecto.

## Files of interest

- `apps/api/package.json` — scripts `migrate*`.
- `apps/api/.sequelizerc` — entorno por defecto de `sequelize-cli`.
- `apps/api/.env.example` — keys disponibles.

## Commits

- `0b2b5b59` — fix(api): run migrations without a .env file
- `df3f11e9` — docs(api): list every env key in env example
- `608601bb` — docs(repo): make api env file optional in setup steps
