# Correcciones de Up Next, listas y sesión en el frontend

**Released:** 2026-10-21

## Summary

Correcciones del frontend encontradas por los specs y los tests de interacción. La más importante: Up Next enviaba en `PUT /users/me/queue` solo las entradas visibles, así que reordenar o quitar con una búsqueda activa o con la cola paginada borraba el resto. Ahora cada escritura pide el orden completo, aplica el cambio visible sobre él y se serializa con las demás. También se corrige la pérdida de un quitado pendiente de Undo al reordenar, tanto en Up Next como en el detalle de lista.

## Highlights

- Reordenar o quitar en Up Next con búsqueda o paginación ya no borra entradas de la cola.
- Un quitado pendiente de Undo sobrevive a un reordenado y el Undo conserva el orden nuevo.
- Las peticiones que esperaban un refresh de token ya no quedan colgadas si el refresh falla.

## Added

- `PendingRemovals` en `apps/web/src/app/shared/utils/pending-removals.ts`: estado de quitados pendientes de Undo y cálculo del orden a guardar.
- `moveIntoFullOrder` y `arrangeIntoFullOrder` en `apps/web/src/app/shared/utils/full-order.ts`.
- `QueueService.updateOrder`, que pide el orden completo, aplica un cambio y guarda.

## Fixed

- `queue-view`: las escrituras pasan por una fila con `concatMap` y siempre envían el orden completo.
- `queue-view` y `list-detail`: reordenar durante la ventana de Undo incluye las entradas pendientes, y el Undo las restaura sin deshacer el reordenado.
- `errorInterceptor`: si el refresh falla, las peticiones en espera reciben su error en lugar de quedar colgadas.
- `StarRating`: las flechas no bajan de 0.5.
- `FavoritesService` y `WishlistService`: la caché de ids usa un flag explícito, no repite `/game-ids` con 0 elementos y se reinicia al cambiar de usuario.
- Modelos: `ratio` y `personalRatio` admiten `null`.

## Files of interest

- `apps/web/src/app/features/queue/queue-view/queue-view.ts`, `apps/web/src/app/features/queue/queue.ts`
- `apps/web/src/app/features/lists/list-detail/list-detail.ts`
- `apps/web/src/app/shared/utils/pending-removals.ts`, `apps/web/src/app/shared/utils/full-order.ts`
- `apps/web/src/app/core/interceptors/error.interceptor.ts`

## Commits

- `cfb87f54` — fix(web): error queued requests when the token refresh fails
- `fbb7507c` — fix(web): keep star rating keyboard steps within 0.5 to 5
- `bfe23d0e` — fix(web): cache favorites and wishlist ids explicitly and reset on user change
- `48de7c9d` — fix(web): allow null ratio and personalRatio in models
- `f8eb72c6` — feat(web): add pending removals helper to keep undoable removals in saved order
- `c41bcec8` — fix(queue): keep pending removals when reordering during the undo window
- `a2ff1ed8` — fix(lists): keep pending removals and new order when reordering during the undo window
- `e55d2f00` — feat(web): add helpers to apply a visible reorder to the full order
- `9b884cad` — feat(queue): add updateOrder to change the full server order before saving
- `5625d696` — fix(queue): keep the whole queue when reordering or removing with a search or pagination
