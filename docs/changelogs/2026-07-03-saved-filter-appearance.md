# Apariencia de vistas guardadas (ícono y color)

**Released:** 2026-07-03

## Summary

Cada `SavedFilter` puede tener un `icon` y un `color` opcionales para que el frontend distinga visualmente las vistas (chips en el backlog, cards en Saved Views). Ambos son campos opcionales validados contra listas curadas: los íconos son nombres de Material Icons y los colores son tokens de la paleta del theme (no valores libres), para evitar íconos inválidos o colores fuera del design system. La lógica de render vive en el frontend; el backend solo persiste y valida.

## Highlights

- Nuevas columnas `icon` (VARCHAR 50) y `color` (VARCHAR 20) en `SavedFilter`, ambas nullable.
- `icon` validado contra 16 nombres de Material Icons; `color` contra 8 tokens de paleta (`brand`, `sky`, `emerald`, `amber`, `rose`, `purple`, `teal`, `slate`).
- Aceptados en create y update; expuestos en el serializer.

## Added

- Constantes `SAVED_FILTER_ICONS` y `SAVED_FILTER_COLORS` (con sus tipos) en `saved-filter.model.ts`.
- Columnas `icon` y `color` en el modelo `SavedFilter`.
- `icon` y `color` (`z.enum(...).nullable().optional()`) en `RegisterSavedFilterSchema` y `UpdateSavedFilterSchema`.
- `icon` y `color` en `savedFilterSerializer`.
- Documentación Bruno actualizada en `create.yml`, `update.yml` y `get-me.yml`.

## Migration

- `20260703140000-add-icon-color-to-saved-filters.js`: agrega las columnas `icon` y `color` (nullable, sin default aparte de NULL). Reversible (drop de ambas columnas).

## Files of interest

- `src/saved-filters/saved-filter.model.ts`
- `src/saved-filters/schemas/register-saved-filter.schema.ts`
- `src/saved-filters/schemas/update-saved-filter.schema.ts`
- `src/saved-filters/saved-filters.serializer.ts`
- `migrations/20260703140000-add-icon-color-to-saved-filters.js`

## Commits

- `8735abe` — feat(saved-filters): add icon and color to views
