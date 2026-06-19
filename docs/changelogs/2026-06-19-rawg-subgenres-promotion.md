# RAWG subgenres promotion

**Released:** 2026-06-19

## Summary

Mejora de calidad del catalogo: ciertos generos populares que RAWG modela como `tags` en lugar de `genres` (Point and Click, Roguelike, Metroidvania, Soulslike, Visual Novel, Deck Building, etc.) ahora se promueven a generos locales en el momento del import. Cierra el gap reportado de que filtrar por "Point and Click" en `/games` no devolvia nada aunque RAWG tuviera juegos taggeados asi.

## Highlights

- Whitelist curada de 11 subgeneros que RAWG expone como tags se mapean a generos locales en el import.
- 11 generos nuevos seedeados en la DB: `point-and-click`, `roguelike`, `roguelite`, `metroidvania`, `soulslike`, `visual-novel`, `deck-building`, `battle-royale`, `survival-horror`, `dungeon-crawler`, `auto-battler`.
- Migracion idempotente: en entornos donde los generos ya existen, los `WHERE NOT EXISTS` los saltan.

## Changed

- `RawgGameSearchResult` extendido con `tags: RawgTag[]` (slug, name, language opcional). Los detalles que devuelve RAWG ya contenian esa coleccion; ahora la tipamos.
- Nuevo `rawg-tag-genre.map.ts` con `RAWG_TAG_GENRE_MAP`. Soporta variantes de slug donde RAWG es inconsistente (`rogue-like` y `roguelike`, `souls-like` y `soulslike`, `deckbuilding` y `deck-building`).
- `rawgToGameMapper.mapGenres()` ahora mergea los generos mayores con las tags promovidas, filtra tags por `language === "eng"` para evitar duplicados localizados y dedupea con `Set`.
- Whitelist en codigo (no en DB) — versionada, sin CRUD admin. Cambia rara vez; cuando aparezca un subgenero nuevo se agrega aqui y listo.

## Migration notes

- `migrations/20260619120000-seed-subgenres.js` inserta los 11 generos faltantes en `Genres` (down quita primero las filas relacionadas en `GameGenres` y luego los generos).
- No hay backfill masivo de juegos ya importados. Los juegos existentes se actualizaran al proximo import natural (refresh admin, re-search, etc.). Si se necesita un backfill on-demand mas adelante, se agregaria un script aparte que recorre el catalogo, vuelve a fetch los slugs RAWG y aplica `mapGenres`.

## Files of interest

### Backend (completr-node-backend)

- `src/rawg/rawg.interface.ts` — agrega `tags: RawgTag[]` y la interface `RawgTag`.
- `src/games/mappers/rawg-tag-genre.map.ts` _(nuevo)_ — whitelist + `mapRawgTagSlugsToGenres`.
- `src/games/mappers/rawg-to-game.mapper.ts` — helper `mapGenres` que mergea generos + tags promovidas con dedupe.
- `migrations/20260619120000-seed-subgenres.js` — seed idempotente de los 11 generos.

## Commits

### Backend (completr-node-backend)

- `b73f3ec` — feat(games): promote curated RAWG tags to local genres
- `6b25d01` — chore(migrations): seed subgenres promoted from RAWG tags
