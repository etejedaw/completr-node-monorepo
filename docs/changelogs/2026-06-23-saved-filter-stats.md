# Estadísticas agregadas por vista guardada

**Released:** 2026-06-23

## Summary

Nuevo endpoint que computa estadísticas del backlog limitadas al universo que matchea una saved view. La idea base es que las stats sobre todo el backlog son ruidosas y caras; sobre una vista filtrada ("Completados 2025-S01", "RPGs cortos", etc.) cuentan una historia. El endpoint reusa el mismo WHERE que `GET /users/me/backlog` aplicando el `filters` JSONB del SavedFilter, pero corre agregaciones SQL puras (`SUM`, `AVG`, `COUNT FILTER`, ratios con `NULLIF`) sin traer filas. Una sola query para las stats globales y tres queries adicionales en paralelo para los highlights (longest played, best personal ratio, highest rated). El cálculo `buildWhere` se extrajo de `backlog.service.ts` a un util compartido para evitar duplicación entre el listado y las stats.

## Highlights

- `GET /users/me/saved-filters/:filterId/stats` devuelve totales (`totalEntries`, `totalRealHours`), promedios (`avgRealDuration`, `avgEstimatedDuration`, `avgScore`, `avgUserRating`, `avgRatio`, `avgPersonalRatio`), delta estimado-vs-real, completion/abandonment rate y tres highlights con cover + link al juego.
- Validación de ownership (404 / 403) y parseo defensivo del JSONB con `BacklogQuerySchema.safeParse` antes de delegar al service de backlog — un saved filter con un JSON corrupto devuelve 400, no 500.
- `buildBacklogWhere` reusable: `findBacklogByUserId`, `findPublicBacklogByUserId` y `computeBacklogStats` aplican exactamente la misma semántica de filtros.
- Documentación Bruno (`docs/api/saved-filters/get-stats.yml`) actualizada con el shape completo de la respuesta y notas sobre semántica de cada campo.

## Added

- **Endpoint**: `GET /users/me/saved-filters/:filterId/stats` (auth: `user`, `premium`, `moderator`; mismo rate limit que el resto del módulo).
- **Service nuevo en backlog**: `computeBacklogStats(userId, filters): Promise<BacklogStats>` con su interface `BacklogStats` (y los subtipos `BacklogHighlight`, `BacklogHighlightGame`).
- **Service nuevo en saved-filters**: `getSavedFilterStats(id, userId)` — orquesta validación de owner, parseo del JSONB y delegación al service de backlog.
- **Util compartido**: `src/backlog/utils/build-backlog-where.util.ts` exporta `buildBacklogWhere(base, filters)`.
- **Bruno entry**: `docs/api/saved-filters/get-stats.yml` (seq 5).
- **TODO**: registrada como hecha la línea del endpoint, y como pendiente la del panel configurable de stats por vista guardada (decisión MVP localStorage vs columna `enabledStats` diferida).

## Changed

- **`backlog.service.ts`**: la función `buildWhere` se eliminó del archivo y se reemplazaron sus dos usos por `buildBacklogWhere` importado del util. Sin cambio de comportamiento.

## Files of interest

- `src/backlog/backlog.service.ts` — `computeBacklogStats` + interfaces `BacklogStats` / `BacklogHighlight` / `BacklogHighlightGame` + helper `findHighlight`.
- `src/backlog/utils/build-backlog-where.util.ts` — WHERE compartido entre listado y stats.
- `src/saved-filters/saved-filters.service.ts` — `getSavedFilterStats`.
- `src/saved-filters/saved-filters.controller.ts` — handler `getSavedFilterStats`.
- `src/saved-filters/saved-filters.routes.ts` — ruta `GET /:filterId/stats`.
- `docs/api/saved-filters/get-stats.yml` — entrada Bruno con shape completo y notas.

## Commits

- `b9c8f52` — feat(saved-filters): add stats endpoint for saved views
- `dee3bd6` — docs(api): add Bruno entry for saved filter stats endpoint
- `b01d496` — feat(saved-filters): add completion/abandonment rates and highlights to stats
- `2e935a6` — docs(api): document new stats fields in saved filter Bruno entry
