# Changelog local para "What's new"

**Released:** 2026-09-19

## Summary

`GET /changelog` reexpone el `/changelog.json` de la landing, y `CHANGELOG_SOURCE_URL` apuntaba por defecto a la landing de producción. Era el único valor por defecto de `environment.config.ts` que no apuntaba a desarrollo local: una entrada nueva en `apps/landing/src/content/releases/` se veía en la landing local pero no en la página "What's new" de la web local. Ahora que la landing vive en el monorepo, el valor por defecto pasa a la landing local y `npm run dev` la levanta junto con la API y la web.

## Changed

- `CHANGELOG_SOURCE_URL` toma por defecto `http://localhost:4321/changelog.json`, la landing de `npm run dev`.
- `npm run dev` levanta API, web y landing con `concurrently`.
- `README.md`, `CLAUDE.md` y `docs/context/landing.md` documentan la fuente del changelog en local y en producción, la caché de 5 minutos y el 503 cuando la landing no responde.

## Migration

- **Producción:** la API necesita `CHANGELOG_SOURCE_URL=https://www.completr.app/changelog.json` en sus variables de entorno. Sin ella, busca la landing en `localhost:4321` y `GET /changelog` responde 503. La variable va en la API, no en la web: la web solo llama a `GET /changelog`.
- **Desarrollo:** para ver entradas nuevas del changelog en "What's new", la landing tiene que estar corriendo. `npm run dev` ya la levanta; con `npm run dev:api` y `npm run dev:web` por separado, levántala con `npm run dev:landing`.

## Files of interest

- `apps/api/src/common/config/environment.config.ts` — valor por defecto de `CHANGELOG_SOURCE_URL`.
- `apps/api/src/changelog/changelog.controller.ts` — proxy con caché de `GET /changelog`.
- `package.json` — script `dev`.

## Commits

- `b92fe926` — chore(changelog): default source url to local landing
- `aaa4b45d` — build(repo): start landing with npm run dev
- `d9bde056` — docs(landing): document local changelog source for what's new
