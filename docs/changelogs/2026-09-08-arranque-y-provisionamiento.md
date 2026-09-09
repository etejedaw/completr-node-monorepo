# Arranque y provisionamiento desde cero

**Released:** 2026-09-08

## Summary

Dos fallos que solo aparecen cuando se levanta el proyecto de cero, detectados al probar el arranque sin `RAWG_API_KEY` contra una base limpia. Ninguno se notaba en un entorno ya provisionado: la cadena de migraciones no llegaba al final en una base nueva, y el logger de desarrollo podia matar el proceso al arrancar.

## Fixed

- **Cadena de migraciones rota en una base nueva.** El initial-schema creaba `Genres` sin `createdAt` ni `updatedAt`, pero el modelo no declara `timestamps: false`, asi que Sequelize los pedia en cada query. Consecuencia: `20260619120000-seed-subgenres` fallaba con `column "createdAt" of relation "Genres" does not exist` y cualquier consulta que incluyera `Genres` —la busqueda de juegos entre otras— devolvia 500. Se reviso el resto de tablas del initial-schema que tampoco tienen timestamps (`GamePlatforms`, `GameGenres`, `ActivityGames`, `ActivityLists`, `ActivityUsers`, `GameScores`, `GameTimes`, `AuditLogs`) y todas coinciden con lo que declara su modelo; `Genres` era la unica discrepancia real.

- **El logger podia tumbar el proceso.** En `dev`, pino usaba `pino-pretty` como transport, que corre en un worker thread. Si el worker moria, se llevaba el proceso entero con `Error: this should not happen: undefined`. Ahora `pino-pretty` se usa como stream directo: mismo formato coloreado, sin worker ni `thread-stream` de por medio.

## Migration notes

- `migrations/20260619115900-add-timestamps-to-genres.js` agrega ambas columnas con `ADD COLUMN IF NOT EXISTS ... TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **El archivo lleva fecha anterior al seed a proposito.** sequelize-cli ejecuta las pendientes ordenadas por nombre de archivo, asi que fechada hoy correria despues del seed y una base nueva seguiria muriendo ahi. Con la fecha anterior, el orden en una base limpia es: crear `Genres` -> agregar timestamps -> seedear subgeneros.
- En una base ya provisionada la migracion se ejecuta igual (sequelize-cli corre toda migracion ausente de `SequelizeMeta`, sin comparar fechas entre si) y no hace nada, porque las columnas ya existen.
- Verificado sobre una base limpia: las 36 migraciones aplican sin errores y el seed inserta sus 11 generos.

## Files of interest

- `migrations/20260619115900-add-timestamps-to-genres.js` — DDL idempotente, fechado antes del seed.
- `src/common/logger/pino.config.ts` — `devLogger` con stream en lugar de transport.

## Commits

- `abcde1a` — fix(migrations): add missing timestamps to genres
- `d15f63f` — fix(logger): run pino-pretty as a stream instead of a worker transport
