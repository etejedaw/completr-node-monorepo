# Tipos de request inferidos de Zod

**Released:** 2026-10-19

## Summary

Los controllers de `apps/api` dejan de castear `request.locals` a objetos escritos a mano o a alias `z.infer` declarados en el propio controller. Cada tipo sale ahora del schema que valida la ruta. Los de params y query se exportan desde su schema. Los de body viven en `dtos/`, con sufijo `Dto`. Así el tipo que usa el controller no puede quedar desfasado de la validación, y cada archivo tiene un solo papel: el schema valida, el DTO tipa el body.

## Highlights

- Los schemas de `params`, `query` y `headers` exportan su tipo inferido debajo del schema (`GameIdParam`, `GamesQuery`).
- Los tipos de body que vivían en archivos `schemas/` pasan a un DTO por archivo.
- `conventions.md` y `modules.md` documentan la regla de tipado.

## Changed

- `activity`, `audit`, `auth`, `games`, `list-items`, `users`, `backlog-progress`, `coop-runs` y `mood-tags`: los controllers castean params y query al tipo exportado por su schema, sin intersecciones ni objetos inline.
- `auth`, `favorites`, `game-reports`, `games`, `list-followers`, `list-items`, `queue`, `reviews`, `score-sources` y `users`: los schemas de body ya no exportan tipo. El tipo pasa a un DTO (`ChangePasswordDto`, `CreateReviewDto`, `AddListItemDto`, `RegisterScoreSourceDto`, entre otros) que importan el controller y, cuando corresponde, el service.
- `activity.service.ts` y `score-sources.service.ts` reciben los tipos inferidos en vez de tipos propios.
- `docs/context/conventions.md`: el ejemplo de DTO usa `import type`, y una regla nueva fija que los DTOs son solo para bodies.
- `docs/context/modules.md`: secciones `controller.ts`, `dtos/` y `schemas/` actualizadas con la regla de casteo y la exportación de tipos.

## Migration

- Body de una ruta nueva: schema en `schemas/` sin tipo exportado y DTO en `dtos/<accion>-<recurso>.dto.ts` con `z.infer`, siempre con sufijo `Dto`.
- Params, query o headers: el tipo se exporta en el mismo archivo del schema (`export type GameIdParam = z.infer<typeof GameIdParamSchema>`) y no lleva DTO.
- En el controller, todo lo que se lee de `request.locals` se castea a uno de esos tipos. Si el schema no existe, se crea antes de tipar.

## Files of interest

- `docs/context/modules.md`
- `docs/context/conventions.md`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/coop-runs/coop-runs.controller.ts`

## Commits

- `42e7ef52` — refactor(api): infer activity feed request types from zod schemas
- `682e9087` — refactor(api): use zod inferred types in controller request casts
- `dbbc7627` — refactor(api): infer params and query types from zod schemas in progress, mood-tags and coop-runs
- `0327782a` — refactor(api): move request body types from schemas into dtos
- `fb2a7ffb` — docs(api): document request typing rules for dtos and schemas
