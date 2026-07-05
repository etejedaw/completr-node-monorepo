# Filtro de co-op en el backlog

**Released:** 2026-07-05

## Summary

El listado de backlog (`GET /users/me/backlog`) acepta un nuevo filtro `coop_only`: cuando es `true`, devuelve solo las entradas jugadas en co-op (las que están vinculadas a un coop run, es decir `coopRunId IS NOT NULL`). En el frontend aparece como un toggle "Only games played in co-op" en el drawer de filtros de My Games, y round-trips en las saved views como los demás filtros.

Esta es la fase 1 de la feature: solo el toggle "solo co-op". La selección de _con quién_ se jugó (filtrar por amigo/s específicos vía `coop_with`) queda para una fase posterior.

## Highlights

- Filtro `coop_only` en el listado de backlog (columna directa `coopRunId IS NOT NULL`).
- Toggle en el drawer de filtros; participa en el conteo de filtros activos, en clear y en saved views.
- Sin cambios de modelo ni de serializer: los datos de co-op (`coopRunId`, `coopMembers`) ya se devolvían por entrada.

## Added

- `coop_only` (stringbool) en `BacklogQuerySchema`.
- Condición `coopRunId != null` en `buildBacklogWhere`.
- Signal `coopOnly` + handler `toggleCoopOnly` y toggle UI en `backlog-list`.
- `coop_only?: boolean` en la interfaz `BacklogFilters` del frontend.

## Changed

- `buildFiltersObject` / `buildBaseFilters` / `applySavedFilterState` y los helpers de count/clear/reset consideran el nuevo filtro.

## Files of interest

- `src/backlog/schemas/backlog-query.schema.ts`
- `src/backlog/utils/build-backlog-where.util.ts`
- `docs/api/backlog/get-my-playthroughs.yml`
- Frontend: `features/backlog/backlog-list/backlog-list.ts` + `.html`, `features/backlog/backlog.ts`

## Notas / pendiente

- Fase 2: `coop_with` (filtrar por amigo/s con selección multi, semántica OR) + índice en `Backlog.coopRunId` (y `(coopRunId, userId)`) para el subquery.

## Commits

- `dafd537` — feat(backlog): add coop_only filter to backlog query
- `9bd0a03` — docs(api): document coop_only backlog filter
