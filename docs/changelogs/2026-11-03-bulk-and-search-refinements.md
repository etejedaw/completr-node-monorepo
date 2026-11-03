# Ajustes de acciones masivas y búsqueda

**Released:** 2026-11-03

## Summary

Arreglos chicos sobre las acciones masivas y la búsqueda contextual entregadas el mismo día: los toasts ya no quedan debajo de la barra de acciones masivas, el diálogo de nota masiva explica cuándo no hay nada para calificar y el desplegable de búsqueda no se cierra antes de registrar el clic en un resultado. Además se sube el aviso de presupuesto del bundle inicial.

## Changed

- El presupuesto `initial` de `apps/web/angular.json` avisa desde 570kB (antes 565kB); el error sigue en 1MB.
- El desplegable de `GlobalSearch` usa el token `shadow-popover` en lugar de una sombra arbitraria.

## Fixed

- `BulkActionBar` marca `<html>` con `data-bulk-bar-open` y `--bulk-bar-clearance` mientras está visible, y `styles.css` sube el contenedor de toasts de ng-primitives (`[data-ngp-toast-container]`) por encima de la barra. Antes, un toast tras un lote con filas omitidas tapaba la barra en mobile.
- `BulkRatingDialog`: si todas las runs seleccionadas están en Not Started y el switch está apagado, el título pasa a "Nothing to rate yet", un aviso explica cómo incluirlas y el botón dice "Rate" (antes "Rate 0 runs").
- `GlobalSearch`: un `mousedown` sobre un resultado (botón o enlace) evita que el campo pierda el foco, así el desplegable no se cierra antes del clic en navegadores que no enfocan los botones al presionarlos (Safari).

## Files of interest

- `apps/web/src/app/shared/components/bulk-action-bar/bulk-action-bar.ts`
- `apps/web/src/styles.css`
- `apps/web/src/app/features/backlog/components/bulk-rating-dialog/bulk-rating-dialog.ts`
- `apps/web/src/app/layout/global-search/global-search.ts`

## Commits

- `5aeefbbb` — build(web): raise the initial bundle budget to 570kB
- `2b38ad07` — fix(web): keep toasts above the bulk action bar
- `d1ca4369` — fix(backlog): explain when there is nothing to rate in bulk
- `28eb2a95` — fix(web): keep the search dropdown open until a result is clicked
- `747170c1` — docs(web): document the bulk bar toast clearance
