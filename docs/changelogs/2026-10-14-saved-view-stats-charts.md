# Gráficos en las stats de las vistas guardadas

**Released:** 2026-10-14

## Summary

Las stats de una vista guardada en My Games pasan al estilo v0.5 y suman dos gráficos. La API agrega la distribución de notas y los completados por mes (cambio aditivo, sin migración: `enabledStats` es un arreglo de texto). La serie mensual termina en el mes del último completado de la vista y no en el mes actual, para que las vistas de semestres o años pasados muestren su propio período.

## Highlights

- Resumen en una fila de cifras grandes, como las stats del perfil.
- Gráficos de completados por mes, juegos por estado, ritmo, estimado contra real y notas.
- Panel de configuración con switches agrupados.

## Added

- API: `ratingDistribution` (cinco buckets de 5 a 1 estrellas; cada `userRating` se redondea hacia arriba) y `completionsByMonth` (12 meses `YYYY-MM` de entradas `completed` por `finishedAt`, terminando en el último completado; arreglo vacío si no hay) en `computeBacklogStats` (`apps/api/src/backlog/backlog.service.ts`). Claves nuevas en `STAT_KEYS` de `saved-filter.model.ts`.
- `RatingDistribution` (`shared/components/rating-distribution`), usado también por las reseñas del juego.
- `StatsCard`, `CompletionsChart` y `StatusBreakdown` en `features/backlog/components/`.
- `STAT_GROUPS` y `SUMMARY_STAT_KEYS` en `features/backlog/saved-filters.ts`; `backlogStatusFillClass` y `BACKLOG_STATUS_ORDER` en `shared/utils/backlog-status.ts`.

## Changed

- `SavedViewStats`: fila de KPIs, tarjetas desplegables con "Charts & more" (`aria-expanded`), destacados con `GamePoster` y estado de error con "Try again".
- `SavedViewStatsPanel`: grupos con `FilterSection` y `ui-switch` en vez de checkboxes; etiquetas sin sufijos "(highlight)" ni "(chips)".
- `DEFAULT_ENABLED_STATS` suma `completionsByMonth` y `countByStatus`. Las vistas con configuración propia no cambian.
- El score promedio se muestra sobre 5, su escala real.
- Bruno: `docs/api/saved-filters/get-stats.yml` y `create.yml`. `docs/context/frontend.md` documenta los componentes nuevos.

## Files of interest

- `apps/api/src/backlog/backlog.service.ts`
- `apps/web/src/app/features/backlog/components/saved-view-stats/`
- `apps/web/src/app/features/backlog/components/completions-chart/completions-chart.ts`

## Commits

- `6cd9de11` — feat(saved-filters): add rating distribution and monthly completions stats
- `071db6d4` — refactor(game-reviews): extract rating distribution into shared component
- `808c9b4f` — feat(backlog): add charts and grouped stat picker to saved view stats
