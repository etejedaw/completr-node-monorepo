# Filtros de backlog para la vista de calendario

**Released:** 2026-06-26

## Summary

Para soportar la nueva vista de calendario del backlog (frontend), el endpoint `GET /users/me/backlog` gana dos capacidades de filtrado por fecha. Decisión clave: en vez de un endpoint nuevo de calendario, se extiende el query builder existente (`build-backlog-where.util.ts`) para reutilizar toda la cadena de filtros y el serializer. El calendario consulta por mes (ventana de ~6 semanas) y, por separado, cuenta las entradas sin agendar.

## Highlights

- `active_from` / `active_to`: filtro de solape. Devuelve las entradas cuyo rango de juego (`startedAt → finishedAt`) cruza el rango pedido.
- Las runs `playing`/`endless` sin fecha de fin se tratan como en curso hasta hoy (`CURRENT_DATE`).
- `undated`: devuelve solo entradas sin `startedAt` ni `finishedAt`, para el contador de "sin agendar" del calendario.
- Ambos filtros componen con el resto (status, plataforma, géneros, rangos) sin duplicar lógica; las entradas sin fechas quedan excluidas del solape de forma natural.

## Added

- `active_from` y `active_to` en `BacklogQuerySchema` (`z.iso.date()`).
- `undated` (`z.stringbool()`) en `BacklogQuerySchema`.
- Condiciones de solape e `undated` en `buildBacklogWhere`, vía `literal` con `COALESCE`/`CASE` sobre `"Backlog"."startedAt"`, `"finishedAt"` y `"status"`.
- Documentación Bruno de los tres params en `get-my-playthroughs.yml`.

## Files of interest

- `src/backlog/schemas/backlog-query.schema.ts`
- `src/backlog/utils/build-backlog-where.util.ts`
- `docs/api/backlog/get-my-playthroughs.yml`

## Commits

- `939eb88` — feat(backlog): add active_from/active_to overlap filter for calendar
- `aad10f8` — docs(api): document backlog active_from/active_to overlap params
- `0798ad4` — feat(backlog): add undated filter for unscheduled entries
- `4bc7f06` — docs(api): document backlog undated query param
