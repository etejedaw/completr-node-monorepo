# Auditoría de queries Sequelize/Postgres y arquitectura services-not-models

**Released:** 2026-06-23

## Summary

Auditoría completa de queries Sequelize/Postgres y de cumplimiento de la regla services-not-models (`docs/context/modules.md:126`). Cubre tres frentes: performance (índices, N+1, attributes en includes, paginación), arquitectura (18 violaciones cross-módulo corregidas en 8 services), y un bug real de BD detectado en el camino — las tablas `GameTimes` y `GameScores` carecían del constraint UNIQUE que la migración inicial declaró, lo que rompía silenciosamente el job `calculate_durations`. También se documenta el patrón de uso de `rethrowSequelizeError` en `docs/context/errors.md` y se hace portable `CLAUDE.md`.

## Highlights

- 4 índices compuestos nuevos en `Backlog` y 2 en `ListItem` para los patrones de query más usados.
- N+1 eliminado en `list-items.replaceItems` y `refreshScores` — pasa de ~4N queries a ~12 + Δposiciones por operación.
- `attributes` restringidos en los includes pesados de `backlog` (Game, Platform) y `games.findGameByCode` (8 includes con whitelist por modelo).
- 18 violaciones services-not-models corregidas en `activity`, `audit`, `reviews`, `queue`, `lists`, `list-items`, `backlog` y `jobs`.
- Patrón sucio de `try { ... } catch (rethrowSequelizeError) { ... } codigo_después;` corregido en 4 lugares y documentado.
- Bug pre-existente arreglado: `POST /admin/jobs/calculate-durations` ahora completa exitosamente (UNIQUE constraint añadido a `GameTimes` y `GameScores`).

## Added

- **Helpers nuevos en services** para soportar la migración services-not-models:
    - `gamesService.findGamesByIds`, `findActiveGameSummaries`, `existsActiveCompilation`, `gameBelongsToCompilation`.
    - `usersService.findUsersByIds`, `countActiveUsers`.
    - `backlogService.findBacklogBasicById`, `findBacklogsByUserAndIds`, `createNotStartedBacklog`, `findBacklogSummariesByUserAndGameIds`, `countDistinctGamesByUserStatusAndGameIds`, `findAggregatedRealDurationsByGame`.
    - `listsService.findListBasicById`.
    - `gameScoresService.findScoresByGameIdsAndSource`, `upsertScore`.
    - `gameTimesService.findTimesByGameIdsAndSource`, `upsertTime`.
    - `gameExternalService.findGameIdsBySource`.
    - `reviewsService.findAggregatedRatingsByGame`.
- **Índices nuevos** en `Backlog`: `(userId, status, finishedAt)`, `(userId, isPublic)`, `(userId, gameId)`, `(gameId, isPublic)`.
- **Índices nuevos** en `ListItem`: `UNIQUE (listId, gameId)` y `(listId, position)`.
- **UNIQUE constraints** en `GameTimes` y `GameScores` sobre `(gameId, source)` — la migración inicial los declaró pero nunca se aplicaron.
- **Sección nueva en `docs/context/errors.md`**: patrón `rethrowSequelizeError` con ejemplo CLEAN vs UGLY.
- **`CLAUDE.md`** ahora versionado en el repo; obliga a leer `docs/context/modules.md` y `conventions.md` al inicio de cada conversación.

## Changed

- **`backlog.service.backlogInclude` y `buildIncludes`**: `Game` ahora trae solo `id, code, title, backgroundUrl, isDlc`; `Platform` solo `id, abbreviation`.
- **`games.findGameByCode`**: los 8 includes (`Platforms`, `Genres`, `GameScores`, `GameTimes`, `GameExternals`, `Dlcs`, `ParentGame`, `CompilationItems`, `PartOfCompilations`) ahora declaran whitelist de attributes.
- **`list-items.replaceItems`**: una sola query batch a `GameScore` / `GameTime` / `ScoreSource` para precargar contexto de scores, en lugar de N×3 dentro de un loop. `bulkCreate` reemplaza los `create` individuales y solo se actualizan las posiciones que realmente cambiaron. Todo envuelto en una transacción.
- **`list-items.refreshScores`**: misma optimización + transacción.
- **`ReplaceWishlistSchema` y `ReplaceFavoritesSchema`**: `gameIds` ahora tiene `.max(100)`.
- **`activity.getFeed`** delega el lookup de following ids en `userFollowersService.getFollowingIds`.
- **`audit.service`, `reviews.service`, `queue.service`, `lists.service`, `list-items.service`, `backlog.service`, `jobs.service`**: removidos los accesos directos a modelos de otros módulos. Ahora todo pasa por los services dueños.
- **Patrón `try/catch` con `rethrowSequelizeError`** uniformizado en `backlog.createBacklog`, `list-items.replaceItems` (transacción), `queue.addFromBacklog`, `wishlist.addToWishlist`: el `return` ahora vive dentro del `try`.

## Fixed

- **`POST /admin/jobs/calculate-durations`**: dejaba el job en `failed` con `there is no unique or exclusion constraint matching the ON CONFLICT specification`. Causa raíz: las tablas `GameTimes` y `GameScores` nunca tuvieron en BD el constraint UNIQUE declarado en la migración inicial — el `IF NOT EXISTS` saltaba la creación. La migración nueva añade el índice único y el upsert funciona.
- **`removeBacklog`** ahora carga solo `id` y `userId` para la validación de propiedad, en lugar del row completo.
- **`assertCompilationContext`** usa counts (vía `gamesService.existsActiveCompilation` y `gameBelongsToCompilation`) en lugar de cargar entidades completas para una validación booleana.

## Migration

Tres migraciones nuevas, todas idempotentes:

- `migrations/20260623120000-add-backlog-indexes.js` — 4 índices compuestos en `Backlog`.
- `migrations/20260623120100-add-listitem-indexes.js` — UNIQUE `(listId, gameId)` y `(listId, position)` en `ListItem`.
- `migrations/20260623180000-add-gametimes-gamescores-unique.js` — UNIQUE `(gameId, source)` en `GameTimes` y `GameScores`.

Ejecutar con `npm run migrate` antes del primer deploy. Las migraciones usan `CREATE INDEX IF NOT EXISTS`, por lo que son seguras de ejecutar varias veces.

**Deuda residual:** las tablas `GameTimes` y `GameScores` siguen sin tener el PRIMARY KEY y FOREIGN KEY que la migración inicial declaró. Funciona porque Sequelize gestiona la integridad a nivel de aplicación, pero conviene restaurarlos en una migración futura.

## Files of interest

- **Models con índices**: `src/backlog/backlog.model.ts`, `src/list-items/list-item.model.ts`.
- **Services refactorizados**: todos los `*.service.ts` mencionados arriba, especialmente `src/list-items/list-items.service.ts` y `src/jobs/jobs.service.ts`.
- **Includes con attributes**: `src/backlog/backlog.service.ts` (constants `BACKLOG_GAME_ATTRS`, `BACKLOG_PLATFORM_ATTRS`), `src/games/services/games-search.service.ts` (constants para `findGameByCode`).
- **Schemas con cap**: `src/wishlist/schemas/replace-wishlist.schema.ts`, `src/favorites/schemas/replace-favorites.schema.ts`.
- **Docs actualizados**: `docs/context/errors.md` (patrón try/catch), `CLAUDE.md` (rutas portables + lectura obligatoria de docs/context).
- **Migraciones nuevas**: `migrations/20260623*.js`.

## Commits

- `1db5105` — perf(backlog): add composite indexes for high-traffic query patterns
- `0f3e15d` — perf(list-items): add unique index on (listId, gameId) and ordering index
- `cf6b5a8` — perf(list-items): batch freezeScores and wrap replace/refresh in transactions
- `a33131a` — perf(backlog): restrict include attributes for Game and Platform
- `bc4937c` — perf(games): restrict include attributes in findGameByCode
- `d29db8e` — perf(wishlist): cap replace payload at 100 ids and trim internal lookup attrs
- `801d87b` — perf(favorites): cap replace payload at 100 ids and trim internal lookup attrs
- `b2f4ee9` — perf(backlog): trim existence checks and route compilation assertion through games service
- `49b1c08` — refactor(list-items): replace direct model access with service calls
- `e290988` — refactor: wrap try blocks until return in services using rethrowSequelizeError
- `ba4975d` — refactor(activity): route getFeed following lookup through user-followers service
- `e0511ab` — refactor(audit): route gameId/userId lookups through services
- `8a8669c` — refactor(reviews): route game lookup through games service
- `3798d71` — refactor(queue): route backlog/game/platform access through services
- `2e7f654` — refactor(lists): route backlog summary and completion count through backlog service
- `d4ec2c4` — refactor(jobs): route all cross-module access through services
- `e227538` — fix(jobs): add missing unique constraints on GameTimes/GameScores so upsert works
- `1682801` — docs(claude): make CLAUDE.md portable — commit it and use relative frontend path
- `83109c0` — docs(errors): document try/catch pattern with rethrowSequelizeError
