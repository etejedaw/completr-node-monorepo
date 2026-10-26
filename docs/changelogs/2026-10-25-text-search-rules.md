# Reglas de búsqueda de texto unificadas

**Released:** 2026-10-25

## Summary

Cada buscador de la API resolvía el texto a su manera: el de juegos quitaba acentos y separaba palabras, mientras que el resto usaba `ILIKE '%texto%'` sin quitar acentos y, salvo usuarios y followers, sin escapar comodines. Ahora todos pasan por un helper común, `text-search.util.ts`, con las mismas reglas: sin distinguir mayúsculas, acentos ni puntuación, todas las palabras en cualquier orden y búsqueda literal. El buscador global de juegos además ordena por relevancia. No hay migración: usa la extensión `unaccent`, que ya estaba instalada.

## Highlights

- "pokemon" encuentra "Pokémon", "spiderman" encuentra "Spider-Man" y "evil resident" encuentra "Resident Evil" en todos los buscadores.
- `%`, `_` y `\` nunca actúan como comodines.
- El buscador global de juegos devuelve primero el título exacto, después los que empiezan con la consulta y luego el resto alfabéticamente.

## Added

- `apps/api/src/common/utils/text-search.util.ts`:
    - `tokenizeSearchQuery`: normaliza con NFD, quita diacríticos, pasa a minúsculas y separa en palabras `a-z0-9`.
    - `buildTextSearchWhere(query, columns)`: una condición por palabra sobre `regexp_replace(lower(unaccent(col)), '[^a-z0-9]', '', 'g')`. Con varias columnas, cada palabra puede estar en cualquiera de ellas. Devuelve `null` si no quedan palabras.
    - `buildTextSearchRelevanceOrder(query, column)`: orden exacto > prefijo > resto, luego alfabético e `id`.

## Changed

- Usan el helper: `games-search.service` (reemplaza `buildTitleSearchWhere`), `games.service` (`searchGames`), `backlog`, `queue`, `favorites`, `wishlist`, `game-shelf`, `lists` (`searchPublicLists`), `saved-filters` (`name` y `description`), `franchises`, `users` (`searchUsers`, `username` y `name`) y `user-followers`.
- Las columnas se pasan con su alias de Sequelize (`Game.title`, `Backlog->Game.title`) para evitar ambigüedad en los joins.
- `searchGamesLocal` y la rama local de `searchGames` ordenan por relevancia.
- Una consulta sin letras ni números no filtra en los listados con `search` opcional y devuelve vacío en `GET /users/search`, `GET /lists/search` y `GET /games/search`. Antes, `search=%` en followers y following buscaba el carácter literal y devolvía 0 resultados.

## Removed

- `apps/api/src/common/utils/escape-like-pattern.util.ts` y la copia local en `users.service`: el helper ya cubre el escape.

## Files of interest

- `apps/api/src/common/utils/text-search.util.ts`
- `apps/api/src/games/services/games-search.service.ts`
- `apps/api/test/common/text-search.integration.test.ts`
- `docs/invariants.md`

## Commits

- `15e4c62e` — feat(common): add text search helper with accent, word order and relevance rules
- `1b978dc7` — refactor(games): use text search helper and rank local results by relevance
- `d755ad1a` — refactor(users): use text search helper in user search and connections
- `4c32122c` — test(user-followers): expect search without letters or digits not to filter
- `a05b61e5` — refactor(backlog): use text search helper in backlog, queue, favorites, wishlist and shelf
- `75b3b7c2` — refactor(lists): use text search helper in lists, saved filters and franchises
- `94ceb50e` — test(common): cover text search rules across search endpoints
- `05396c56` — docs(invariants): describe common text search rules
- `6075c0df` — docs(api): document text search rules in search parameters
