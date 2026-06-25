# Mood tags module

**Released:** 2026-06-25

## Summary

Nuevo módulo `mood-tags` que permite al usuario asignar etiquetas libres a los juegos de su colección (relajante, podcast game, sesiones cortas, etc.) y filtrar el backlog por ellas. Los tags son por `(user, game)` — no por run — lo que significa que renombrar o borrar un tag se propaga a todas las runs del mismo juego. La unicidad emerge de la normalización (`lowercase + trim + sin acentos + colapso de whitespace`) más un constraint `(userId, gameId, tag)`, con índices `(userId, tag)` y `(gameId, tag)` pensados para una futura agregación community-wide. Una segunda tabla `MoodTagMetas` guarda metadatos opcionales (descripción) con unique `(userId, tag)` para sostener rename merge-safe.

Los tags se serializan en batch en las respuestas de `backlog`, `game-shelf`, `queue`, `wishlist`, `favorites` y `GET /games/:code` (solo cuando el viewer es el dueño), con un solo query por endpoint via `moodTagsService.findTagsForGames(userId, gameIds)` para evitar N+1.

## Highlights

- Endpoint dedicado por juego: `PUT /users/me/games/:gameId/mood-tags` (idempotente, max 10 tags, normalización server-side).
- Gestión global por usuario: `GET /users/me/mood-tags` (con `usageCount` + `description`), `POST` para crear huérfanos, `PATCH` para renombrar/describir, `DELETE` para borrar en cascada.
- Filtro `mood_tags=tag1,tag2` en `GET /users/me/backlog` con semántica AND vía `COUNT(DISTINCT tag) = N`.
- Tags incluidos en los listings de la librería (`shelf`, `queue`, `wishlist`, `favorites`) solo para self-view.
- Rename con merge automático: `ON CONFLICT DO NOTHING` en bulk insert + borrado del row viejo + traspaso de descripción si el target no tenía.

## Added

- Módulo `src/mood-tags/` siguiendo la convención completa (model, service, controller, routes, schemas, dtos, errors).
- Migraciones `20260625140000-create-user-game-tags.js` y `20260625150000-create-mood-tag-metas.js`.
- 6 endpoints documentados en `docs/api/mood-tags/`: `get-my-tags`, `get-game-tags`, `put-game-tags`, `create-tag`, `update-tag`, `delete-tag`.
- Campo `mood_tags` en `BacklogQuerySchema` con transform CSV → array.
- Campo `moodTags` en serializers de `backlog`, `game-shelf`, `queue`, `wishlist`, `favorites` y `game-detail`.

## Changed

- `backlogSerializer` y `backlogPublicSerializer` aceptan `moodTags?: string[]`.
- `buildBacklogWhere` agrega subquery `IN (SELECT gameId FROM UserGameTags WHERE userId = X AND tag IN (...) GROUP BY gameId HAVING COUNT(DISTINCT tag) = N)`.
- Controllers de library (`getMe*`, `putFavorites`, `putWishlist`, `putQueue`) cargan tags en batch antes de serializar.
- En endpoints públicos (`getUserShelf/Favorites/Wishlist`), los tags solo se incluyen si `currentUser.id === user.id`.
- Decisión documentada en TODO: backlog randomizer y badges difieren a Fase 4/6 respectivamente.

## Migration

Las dos tablas se crean vacías. Los tags se asignan progresivamente a medida que el usuario los va creando — no hay backfill desde notes ni otra fuente.

## Files of interest

- `src/mood-tags/user-game-tag.model.ts`
- `src/mood-tags/mood-tag-meta.model.ts`
- `src/mood-tags/mood-tags.service.ts`
- `src/mood-tags/mood-tags.controller.ts`
- `src/mood-tags/mood-tags.routes.ts`
- `src/mood-tags/normalize-tag.util.ts`
- `src/backlog/utils/build-backlog-where.util.ts`
- `src/backlog/backlog.serializer.ts`
- `src/games/games.controller.ts`
- `migrations/20260625140000-create-user-game-tags.js`
- `migrations/20260625150000-create-mood-tag-metas.js`
- `docs/api/mood-tags/`

## Commits

- `5d152d2` — docs(todo): defer randomizer and badges, log mood tags decisions
- `bb303e4` — feat(mood-tags): add module with per-game tags, metadata and management endpoints
- `f8f9c23` — feat(backlog): filter and serialize mood tags on backlog entries
- `182e920` — feat(games): include user mood tags in game-detail response
- `ebe4c07` — feat(library): serialize user mood tags in shelf, queue, wishlist and favorites
