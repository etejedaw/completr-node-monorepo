# Mover una entrada de Up Next sin reemplazar la cola

**Released:** 2026-10-28

## Summary

Reordenar Up Next podía borrar entradas: mover arriba, mover abajo, arrastrar y "Move to top" mandaban `PUT /users/me/queue` con las entradas visibles, y `replaceQueue` borra la cola completa antes de recrearla, así que con una búsqueda activa o fuera de la primera página se perdía lo que no se veía. Ahora cada movimiento es un `PATCH` que mueve una sola entrada y desplaza las demás en el servidor, sin depender de lo que tenga cargado el frontend. El `PUT` queda solo para reemplazar la cola con el orden completo.

## Highlights

- `PATCH /users/me/queue/:backlogId/position` con `{ position }` (base 1): mueve una entrada en una transacción, bajo el advisory lock de la cola del usuario, y devuelve la cola completa con el mismo formato que `PUT`.
- Mover arriba o abajo, arrastrar y "Move to top" ya no borran ni recrean nada: un desorden por una carrera solo afecta posiciones.
- Si un movimiento falla, la web muestra un toast y recarga la cola para revertir el orden optimista.

## Added

- `queue.service.moveQueueEntry` y `move-in-order.util.ts`; la renumeración es un único `UPDATE ... unnest WITH ORDINALITY`.
- Schemas `move-queue-entry-body.schema.ts` y `queue-backlog-id-params.schema.ts`, DTO `move-queue-entry.dto.ts`.
- Bruno: `docs/api/queue/move-position.yml`.

## Changed

- Una posición mayor que el tamaño de la cola se ajusta a la última; los valores que no son enteros entre 1 y 2147483647 responden 422 `COMMON_SCHEMA_INVALID`. Un backlog que no está en la cola del usuario, desconocido o ajeno, responde 404 `QUEUE_BACKLOG_NOT_FOUND`.
- Web (`features/queue/queue.ts`, `queue-view`): mover arriba o abajo y arrastrar leen `backlog-ids` para traducir el movimiento visible a una posición absoluta y mandan solo esa posición; "Move to top" manda `position: 1` sin lectura previa.
- "Save as my order" sigue con `PUT`, pero con el orden completo recién leído de `backlog-ids`.
- `queue.controller`: `respondWithQueue` compartido entre `PUT` y `PATCH`.

## Files of interest

- `apps/api/src/queue/queue.service.ts`
- `apps/api/src/queue/move-in-order.util.ts`
- `apps/web/src/app/features/queue/queue.ts`
- `apps/web/src/app/features/queue/queue-view/queue-view.ts`

## Commits

- `99286c39` — feat(queue): add endpoint to move a single entry to a position
- `dadae600` — test(queue): cover single entry moves and keep hidden entries
- `8a106743` — fix(web): move queue entries with the position endpoint instead of replacing the queue
- `61b8189f` — test(web): cover queue moves with repeated clicks and failed requests
- `0bd311eb` — docs(queue): document move position endpoint
