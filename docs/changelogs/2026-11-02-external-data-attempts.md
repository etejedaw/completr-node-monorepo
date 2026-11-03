# Datos externos: intentos recientes y reanudación del job

**Released:** 2026-11-02

## Summary

El job `populate_external_data` ya guardaba cada valor apenas lo obtenía, pero no recordaba los juegos sin resultado. Como los candidatos se recorrían por título, cada corrida empezaba por los mismos juegos `not_found`, `ambiguous`, `no_data` o `failed` de la anterior, gastaba en ellos las requests a Metacritic, Wikidata y HowLongToBeat y se detenía por rate limit antes de llegar a juegos nuevos: en una corrida de producción, 60 de 64 juegos procesados terminaron sin dato. Esta entrega registra el último intento por juego y fuente en la tabla `ExternalDataAttempts`. El job salta una fuente mientras su intento esté en espera y procesa primero los juegos nunca intentados y después el intento más antiguo, así que una corrida cortada se retoma donde quedó. Los fallos que no dependen del juego (rate limit, bloqueo, parseo, Wikidata, pausa de la búsqueda de ids, plazo vencido) no se registran, y ese juego queda primero para la corrida siguiente.

## Highlights

- Un juego sin dato no se vuelve a pedir durante 30 días (`not_found`, `ambiguous`) o 7 días (`no_data`, `failed`), por fuente.
- Orden de proceso: nunca intentados, después el intento más antiguo, con el título como desempate.
- El `result` del job agrega `Skipped recently attempted: N`.

## Added

- Módulo `external-data-attempts/`: modelo `ExternalDataAttempt` y service con `findAll`, `record` y `clear`.
- Tabla `ExternalDataAttempts` (migración `create-external-data-attempts-table`): `gameId` con `ON DELETE CASCADE` desde `Games`, `source` (`enum_ExternalDataAttempts_source`), `status` (`enum_ExternalDataAttempts_status`), `attemptedAt` y único `("gameId", source)`.
- `EXTERNAL_DATA_RETRY_COOLDOWN_MS`, `EXTERNAL_DATA_SOURCE_UNAVAILABLE` y las listas de fallos no registrados en `games/games.constants.ts`.
- Utils `externalDataAttemptStatus` e `isCoolingDown` en `games/utils/`.
- Tests de integración del job para la espera, el orden, los fallos no registrados y el borrado en cascada.

## Changed

- `refreshExternalDataForGame` registra el intento tras cada fuente: `updated` borra la fila, el resto la crea o la pisa. Lo usan el job, el refresco individual y el enriquecimiento al importar; el refresco individual no respeta la espera.
- `findGamesMissingExternalData` filtra las fuentes en espera, ordena por intento más antiguo y devuelve `recentlyAttemptedCount`.
- `docs/invariants.md` y la colección de Bruno (`jobs/populate-external-data.yml`) documentan la tabla, la espera, el orden y el nuevo campo del `result`.

## Files of interest

- `apps/api/src/external-data-attempts/external-data-attempt.model.ts`
- `apps/api/src/games/services/games-external-data.service.ts`
- `apps/api/src/games/utils/external-data-attempt-status.util.ts`
- `apps/api/src/jobs/jobs.service.ts`
- `apps/api/migrations/20261103010119-create-external-data-attempts-table.js`
- `apps/api/test/admin/admin-external-data-job.integration.test.ts`

## Commits

- `9ccd9aab` — feat(external-data-attempts): add the table that remembers each external data attempt per game and source
- `54df185a` — feat(jobs): skip recently attempted games and resume populate external data from the oldest attempt
- `6eb5ca3c` — docs(api): document external data attempts and the populate external data order
