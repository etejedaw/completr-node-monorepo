# Ordenamiento de vistas guardadas

**Released:** 2026-07-03

## Summary

Soporte de backend para que el usuario ordene sus vistas guardadas (`SavedFilter`). Dos capacidades independientes: exponer `createdAt` para permitir un "sort by" no persistente en la página de gestión (el orden lo aplica el frontend en cliente), y un orden persistente propio para las vistas pinneadas que se muestran como chips en el backlog. Para lo persistente se añade una columna `position` al modelo y un endpoint de reordenamiento; el listado pasa a ordenar por `position ASC`, y cada vista nueva se crea al final (`position = max + 1`).

## Highlights

- `createdAt` se incluye en el serializer de `SavedFilter`, habilitando ordenar por fecha en la vista de gestión.
- Nueva columna `position` en `SavedFilter` con migración y backfill por `createdAt` por usuario.
- `PUT /users/me/saved-filters/reorder`: recibe el arreglo de ids en el orden deseado y reasigna posiciones en una transacción, validando ownership.
- El listado de vistas ordena por `position ASC` y las vistas nuevas se crean al final de la cola.

## Added

- Campo `createdAt` en `savedFilterSerializer`.
- Columna `position` (`INTEGER NOT NULL DEFAULT 0`) en el modelo `SavedFilter`.
- `reorderSavedFilters(userId, ids)` en el service: valida que todos los ids sean del usuario, reasigna `position` de forma diferencial dentro de una transacción y devuelve las vistas ordenadas.
- Endpoint `PUT /users/me/saved-filters/reorder` con `ReorderSavedFiltersSchema` (array de uuid único, 1-100), su DTO, controller `putReorderSavedFilters` y ruta.
- Documentación Bruno: `reorder.yml` nuevo y `createdAt` en `get-me.yml`.

## Changed

- `findSavedFiltersByUserId` ordena por `position ASC, createdAt DESC` (antes solo `createdAt DESC`).
- `createSavedFilter` asigna `position = max(position) + 1` del usuario, dejando las vistas nuevas al final.

## Migration

- `20260703120000-add-position-to-saved-filters.js`: agrega la columna `position` y backfilea el orden actual con `ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC)`. Reversible (drop de la columna).

## Files of interest

- `src/saved-filters/saved-filter.model.ts`
- `src/saved-filters/saved-filters.service.ts`
- `src/saved-filters/saved-filters.serializer.ts`
- `src/saved-filters/saved-filters.controller.ts`
- `src/saved-filters/saved-filters.routes.ts`
- `src/saved-filters/schemas/reorder-saved-filters.schema.ts`
- `migrations/20260703120000-add-position-to-saved-filters.js`
- `docs/api/saved-filters/reorder.yml`

## Commits

- `e59bd87` — feat(saved-filters): expose createdAt in serializer
- `57d7030` — feat(saved-filters): add position column and reorder endpoint
