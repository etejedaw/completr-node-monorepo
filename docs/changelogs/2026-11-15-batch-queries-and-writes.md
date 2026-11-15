# Escrituras y consultas en lote

**Released:** 2026-11-15

## Summary

Auditoría de consultas N+1 en `apps/api`. Los serializers no tenían ninguna; los casos reales estaban en un listado de admin, en dos jobs y en el registro de actividad de las operaciones masivas, que hacían una consulta o una transacción por fila.

## Changed

- `GET /admin/rewinds` resuelve el acceso de IA de todos los dueños de la página con `resolvePremiumAccessForUsers` en una consulta, en vez de una por dueño.
- Los jobs `calculate-ratings` y `calculate-durations` guardan con `upsertScores` y `upsertTimes` en lotes de `COMMUNITY_AGGREGATION_BATCH_SIZE` (500), en vez de un upsert por juego.
- Las operaciones masivas de `backlog`, `favorites`, `wishlist` y `queue` registran la actividad con `activityService.recordManyForGames` en una transacción con dos inserts, en vez de una transacción por juego. El orden cronológico se conserva.

## Files of interest

- `apps/api/src/premium-access/services/premium-access.service.ts`
- `apps/api/src/jobs/jobs.service.ts`
- `apps/api/src/activity/activity.service.ts`

## Commits

- `d618503a` — perf(rewind): resolve admin rewind AI access in one query
- `c281d840` — perf(jobs): upsert community scores and times in batches
- `88f11d5e` — perf(activity): record bulk game activities in one batch
- `ff1ed209` — test(jobs): seed the completr score source and scope the concurrent start assertion
