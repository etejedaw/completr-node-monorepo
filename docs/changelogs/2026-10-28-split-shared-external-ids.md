# Split con external ids compartidos

**Released:** 2026-10-28

## Summary

`POST /games/:id/split` respondía 409 `GAME_UNIQUE_CONSTRAINT` con cualquier juego que tuviera un external id, aunque ningún título chocara. La causa era un índice único heredado de cuando el esquema se creaba con `sync()`: `game_externals_source_external_id` sobre `(source, "externalId")`. La migración `20260521155650-add-variant-to-games-and-relax-game-external.js` quitó la unicidad para permitir variantes que comparten external id, pero solo buscaba constraints (`pg_constraint`), no índices, así que en las bases creadas con `sync()` el índice sobrevivió y el split no podía copiar el external a las variantes nuevas. Una migración nueva lo borra junto con dos índices únicos duplicados del mismo origen, y el editor explica mejor el único 409 que queda: un slug ya usado por otro juego, que puede estar inactivo y no aparecer en la lista.

## Highlights

- Split funciona con juegos que tienen external id: las variantes comparten el id, como se diseñó.
- El 409 del split en el editor avisa que el slug puede pertenecer a un juego inactivo.

## Fixed

- Migración `20261028040646-drop-legacy-unique-indexes-from-game-tables.js`:
    - Borra `game_externals_source_external_id`. Queda `game_externals_source_external_id_idx`, sin unicidad, para las búsquedas.
    - Borra `game_scores_game_id_source` y `game_times_game_id_source`, que duplicaban `gamescores_gameid_source_unique_idx` y `gametimes_gameid_source_unique_idx`. La unicidad `(gameId, source)` se mantiene.
    - Usa `DROP INDEX IF EXISTS`: en bases creadas solo con migraciones no hace nada.

## Changed

- El editor de juegos muestra "A target title produces a slug already used by another game, possibly an inactive one. Use unique titles." ante un 409 `GAME_UNIQUE_CONSTRAINT` del split.
- `docs/api/games/split.yml` describe el 409 como un code ya usado por otro juego, activo o inactivo.

## Migration

- Aplicar con `npm run migrate:prod` (y `npm run migrate:dev` en local). El `down` vuelve a crear los índices, y el de `GameExternals` falla si ya hay variantes que comparten external id.

## Files of interest

- `apps/api/migrations/20261028040646-drop-legacy-unique-indexes-from-game-tables.js`
- `apps/api/src/games/services/games-variant.service.ts`
- `apps/web/src/app/features/games/admin-game-editor/admin-game-editor.ts`

## Commits

- `b4bae50c` — fix(api): drop legacy unique indexes that blocked splitting games with shared external ids
- `fde690c2` — fix(web): explain that a split slug can collide with an inactive game
- `8dfa1a1c` — docs(api): clarify split unique constraint error
