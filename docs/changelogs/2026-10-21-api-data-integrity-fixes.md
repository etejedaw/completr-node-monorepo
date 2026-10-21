# Correcciones de integridad de datos en la API

**Released:** 2026-10-21

## Summary

Correcciones de bugs encontrados por la suite de tests nueva: validaciones que respondían 500, reordenados que perdían datos, posiciones con huecos o repetidas y respuestas con formas inconsistentes. Las posiciones de la queue y de los list-items pasan a renumerarse en la misma transacción de cada baja, y las operaciones sobre la queue de un usuario se serializan con un advisory lock de PostgreSQL.

## Highlights

- Las posiciones de la queue y de los list-items quedan siempre en 1..n, sin huecos ni duplicados.
- Reordenar la wishlist conserva la plataforma deseada de cada entrada y corre en una transacción.
- `ratio` y `personalRatio` se serializan como `null` cuando falta score o duración, en vez de omitirse.
- Entradas inválidas que antes daban 500 ahora responden 422.

## Fixed

- `game-shelf`: `gameId` y `platformId` se validan como UUID; antes un id mal formado respondía 500.
- `wishlist`: `replaceWishlist` conserva el `platformId` de las entradas que siguen y corre en una transacción.
- `auth`: el mensaje de `PasswordPolicySchema` indica el máximo real de 15 caracteres.
- `calculateRatio` devuelve `null` en vez de `undefined`; ajustados los serializers de backlog, list-items, lists y games.
- `backlog`: `BACKLOG_UNIQUE_CONSTRAINT` se mapea a 409 en lugar de caer en 500.
- `backlog`: `endless` tiene prioridad junto a `playing` en los resúmenes de backlog por juego.
- `queue`: toda salida de la queue (cambio de status, borrado del backlog) compacta las posiciones; el alta usa `MAX(position) + 1` bajo `pg_advisory_xact_lock`.
- `list-items`: `removeItem` renumera los items restantes en la misma transacción.
- `saved-filters`: los filtros se validan con `BacklogQuerySchema` al crear y editar, y `SAVED_FILTER_VALIDATION_ERROR` responde 422.
- `lists`: `limit` en `/lists/recent` y `/lists/official` se valida (entero de 1 a 50) en vez de llegar como `NaN` a Sequelize.
- `lists`: los `previewItems` de los resúmenes de lista se ordenan por `position`; antes Postgres podía devolverlos en cualquier orden.

## Changed

- `games`: `buildOrder` sin la rama duplicada de `NULLS LAST`, sin cambio de comportamiento.
- `docs/invariants.md`: índice no único de `(list_id, position)`, compactación de posiciones y validaciones nuevas.
- Colección Bruno: ratios en `null`, `endless`, errores nuevos y renumeración de posiciones.

## Files of interest

- `apps/api/src/queue/queue.service.ts`, `apps/api/src/list-items/list-items.service.ts`
- `apps/api/src/wishlist/wishlist.service.ts`
- `apps/api/src/common/utils/calculate-ratio.util.ts`
- `apps/api/src/saved-filters/schemas/saved-filter-filters.schema.ts`, `apps/api/src/lists/schemas/discovery-query.schema.ts`
- `docs/invariants.md`

## Commits

- `bdbd5d3d` — fix(game-shelf): validate gameId and platformId as UUIDs
- `b7cf3a0d` — fix(wishlist): keep platforms and use a transaction when replacing the wishlist
- `a92bf960` — fix(auth): correct the password max length message
- `7d093063` — fix(api): return null instead of undefined when a ratio cannot be calculated
- `f2d770a8` — fix(backlog): map BACKLOG_UNIQUE_CONSTRAINT to a 409 domain error
- `aa226990` — fix(backlog): rank endless alongside playing in game backlog summaries
- `f801fc80` — refactor(games): drop the duplicated NULLS LAST branch in buildOrder
- `b2e6fdad` — docs(invariants): document list item position as a non unique index
- `ffe798ab` — docs(api): document null ratios, endless status and new errors in the Bruno collection
- `c1c23cd2` — fix(queue): compact positions when an entry leaves the queue
- `36e8d5d0` — fix(list-items): renumber positions after removing an item
- `9bbe5e9b` — docs(api): document queue and list item position compaction
- `e39591de` — fix(saved-filters): validate filters and map stored validation errors to 422
- `3a0063dc` — fix(lists): validate limit on recent and official lists
- `33d94059` — docs(invariants): document saved filter, co-op and list discovery validations
- `1d294d62` — docs(invariants): document queue and list item position compaction
- `2e7ac321` — fix(lists): sort preview items by position in list summaries
