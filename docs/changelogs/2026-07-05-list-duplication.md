# Duplicar listas

**Released:** 2026-07-05

## Summary

Nuevo endpoint `POST /lists/:listId/duplicate` que crea una copia editable de una lista dentro de las listas propias del usuario. Copia el nombre (overridable), la descripción, las fuentes de score/duration y todos los `ListItem` (con sus valores congelados y posición) en una sola transacción. La lista origen debe ser pública o propia; la copia queda privada por defecto. Respeta el límite free de 5 listas.

## Highlights

- Copia atómica de una lista pública o propia a las listas del usuario.
- Nombre editable (default `<nombre> (copy)`) y visibilidad configurable (privada por defecto).
- Reutiliza el límite free de listas y el control de acceso por visibilidad y propiedad.

## Added

- `POST /lists/:listId/duplicate` con `DuplicateListSchema` (`name`, `isPublic?`).
- `listsService.duplicateList` transaccional (crea la lista y `bulkCreate` de los items).

## Files of interest

- `src/lists/lists.service.ts` — `duplicateList`.
- `src/lists/lists.controller.ts` — `postDuplicateList`.
- `src/lists/lists.routes.ts`
- `src/lists/schemas/duplicate-list.schema.ts` y `dtos/duplicate-list.dto.ts`

## Commits

- `ad27c69` — feat(lists): add duplicate list endpoint
- `38f92fa` — docs(api): document duplicate list endpoint
