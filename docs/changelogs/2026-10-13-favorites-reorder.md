# Reordenar favoritos

**Released:** 2026-10-13

## Summary

La vista de favoritos permite reordenar los juegos arrastrando o con botones. Al terminar cada movimiento, la web envía el orden completo con `replaceFavorites`. En la API, `replaceFavorites` y `replaceQueue` borraban y volvían a crear las filas en dos pasos separados, de modo que un fallo entre ambos dejaba al usuario sin lista. Ahora cada reemplazo corre en una transacción.

## Added

- `FavoriteReorderCard` (`features/favorites/components/favorite-reorder-card`): tarjeta con asa de arrastre y acciones para mover al inicio, antes y después.
- Modo de reordenamiento en `favorites-view`: se activa con `startReordering()` y solo cuando no hay búsqueda, la página es la primera y se ven todos los favoritos. Usa `CdkDropList` y `CdkDrag`.
- Los cambios de orden se encolan con `concatMap`, de modo que se guardan en secuencia. Si el guardado falla, se muestra un toast y se recarga la lista.
- Anuncio accesible de la nueva posición y foco conservado sobre el botón usado.

## Fixed

- `favorites.service.ts`: `replaceFavorites` hace `destroy` y `bulkCreate` dentro de `sequelize.transaction`.
- `queue.service.ts`: `replaceQueue` hace lo mismo.

## Files of interest

- `apps/web/src/app/features/favorites/favorites-view/favorites-view.ts`
- `apps/web/src/app/features/favorites/components/favorite-reorder-card/favorite-reorder-card.ts`
- `apps/api/src/favorites/favorites.service.ts`
- `apps/api/src/queue/queue.service.ts`

## Commits

- `b231313a` — fix(favorites): replace order inside a transaction
- `4e5b2993` — feat(favorites): reorder favorites by drag and buttons
- `10d634ef` — fix(queue): replace order inside a transaction
