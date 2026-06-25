# Configurable saved-filter stats

**Released:** 2026-06-25

## Summary

Las saved views del backlog ahora persisten qué stats del panel de "Stats" se muestran. El backend almacena la selección como columna `enabledStats TEXT[]` en `SavedFilters`; el frontend renderiza solo los stats marcados y sigue usando defaults hardcodeados cuando la columna es `null`. La decisión arquitectónica clave fue persistir en base (sync cross-device) en lugar de localStorage, manteniendo el endpoint `GET /users/me/saved-filters/:id/stats` intacto: devuelve todos los stats y el frontend recorta.

## Highlights

- Nueva columna `enabledStats` opcional en `SavedFilters` con enum cerrado de 15 claves de stats.
- Validación estricta: `null` (defaults), `[]` (mostrar nada), o array de claves conocidas. Claves inválidas devuelven 422.
- Endpoint de stats sin cambios — la lógica de visibilidad vive en frontend.

## Added

- Migración `20260625120000-add-enabled-stats-to-saved-filters.js`.
- Campo `enabledStats` en `SavedFilter` model, schemas (`register`, `update`) y serializer.
- Lista canónica `STAT_KEYS` exportada desde `saved-filter.model.ts` para validación Zod compartida.

## Files of interest

- `migrations/20260625120000-add-enabled-stats-to-saved-filters.js`
- `src/saved-filters/saved-filter.model.ts`
- `src/saved-filters/schemas/register-saved-filter.schema.ts`
- `src/saved-filters/schemas/update-saved-filter.schema.ts`
- `src/saved-filters/saved-filters.serializer.ts`
- `docs/api/saved-filters/create.yml`
- `docs/api/saved-filters/update.yml`
- `docs/api/saved-filters/get-me.yml`

## Commits

- `a34dffa` — feat(saved-filters): persist enabledStats per saved view
- `525ff1b` — docs(api): document enabledStats field in saved-filters collection
