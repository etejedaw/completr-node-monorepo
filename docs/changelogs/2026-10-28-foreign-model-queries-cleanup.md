# Consultas a modelos ajenos a través de su service

**Released:** 2026-10-28

## Summary

La regla de `docs/context/modules.md` dice que un módulo no importa el modelo de otro: lo consulta a través del service del módulo dueño. Una auditoría de los módulos pendientes de revisión mostró que solo usaban modelos ajenos en `include`, lo que la excepción de pivotes permite, y encontró violaciones reales (CRUD o consultas directas sobre modelos ajenos) en otros módulos. Se corrigieron sin cambiar comportamiento ni respuestas HTTP, y la lista de módulos pivote quedó explícita.

## Changed

- `favorites`, `wishlist`, `franchises`, `game-scores` y `game-times` consultan juegos y plataformas con `games.service` y `platforms.service` (`findGamesByIds`, `findGameRecordById`, `existsGameById`, `findExistingGameIds`, `clearFranchiseFromGames`, `assignFranchiseToGames`), propagando la transacción cuando la operación la usa.
- `coop-runs` pasa por `backlog.service` (funciones de co-op nuevas), `user-followers.service` y `users.service` en vez de usar `Backlog`, `UserFollower` y `User`.
- `lists` usa `list-followers.service` (`countListFollowers`, `countFollowersByListIds`, `isUserFollowingList`) y `list-items.service` (`copyItemsToList`, `findGameIdsByListId`, `findListIdsContainingGameOwnedBy`); `list-items` usa `lists.service.findListsByIds`.
- `games.isGameInUse` pregunta a cada service dueño con `existsByGameId` (backlog, game-shelf, list-items, favorites, wishlist, reviews, coop-runs, mood-tags, game-platinum y activity) y `backlog.service.existsByCompilationGameId`, en el mismo orden y con el mismo cortocircuito. Se eliminó `USER_DATA_MODELS`.
- `docs/context/modules.md`: la excepción de pivotes lista sus módulos (`game-platform`, `game-genre`, `game-shelf`, `list-items`, `game-reports`, `user-followers`, `user-follow-requests` y `list-followers`) y cubre solo `include`, asociaciones y `order`, nunca CRUD sobre el modelo ajeno.

## Commits

- `0b4a3591` — docs(modules): list pivot modules explicitly and restrict the exception to includes
- `06f31290` — refactor(lists): use list services instead of foreign models
- `035bf27b` — refactor(coop-runs): query backlogs, users and followers through their services
- `117d7b72` — refactor(games): replace foreign model queries with owner service functions
