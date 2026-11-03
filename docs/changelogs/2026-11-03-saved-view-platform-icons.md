# Íconos de plataforma en las vistas guardadas

**Released:** 2026-11-03

## Summary

Las vistas guardadas de My Games suman tres íconos de plataforma: `smartphone`, `computer` y `tv`. La lista de íconos permitidos vive duplicada en la API, que la valida con `z.enum`, y en la web, que pinta el selector, así que el cambio toca las dos en el mismo orden. La columna `icon` de `SavedFilters` es `VARCHAR(50)` sin constraint, por lo que no hay migración. De paso, los botones del selector de íconos y de colores dejan de anunciarse con el nombre técnico (`sports_esports`, `emerald`) y usan una etiqueta legible.

## Highlights

- Íconos Phone, PC y TV en el selector de las vistas guardadas, justo después del gamepad.
- Lectores de pantalla y tooltips nombran cada ícono y cada color en lenguaje natural.

## Added

- `smartphone`, `computer` y `tv` en `SAVED_FILTER_ICONS` de `saved-filter.model.ts` (API) y de `saved-filter-appearance.ts` (web), después de `sports_esports`. Los schemas de alta y edición los aceptan sin cambios porque leen la misma constante.
- `SAVED_FILTER_ICON_LABELS` y `savedFilterIconLabel()` en `saved-filter-appearance.ts`: mapa ícono → etiqueta ("Phone", "PC", "TV", "Gamepad"…) con el nombre técnico como respaldo.
- `label` en cada entrada de `SAVED_FILTER_COLORS` ("Theme color", "Sky blue", "Green"…).
- Tests de integración que crean vistas con los tres íconos y actualizan una a `smartphone`, y `saved-filter-appearance.spec.ts` para el orden de los íconos y las etiquetas.

## Changed

- `SavedFiltersView`: los botones de ícono y de color usan la etiqueta legible como `aria-label` y `title`.
- `docs/api/saved-filters/create.yml` lista los íconos nuevos; `update.yml` remite a esa lista.

## Files of interest

- `apps/api/src/saved-filters/saved-filter.model.ts`
- `apps/web/src/app/features/backlog/saved-filter-appearance.ts`
- `apps/web/src/app/features/backlog/saved-filters-view/saved-filters-view.html`
- `apps/api/test/saved-filters/saved-filters.integration.test.ts`

## Commits

- `765f4ab8` — feat(api): add platform icons to saved filters
- `257a0899` — test(api): cover platform icons on saved filters
- `2d05a9bd` — docs(api): list platform icons for saved filters
- `3f798d21` — feat(web): add platform icons and readable labels to saved view picker
- `263607c3` — test(web): add saved filter appearance spec
- `6a5caf6b` — fix(backlog): give saved view color swatches readable names
