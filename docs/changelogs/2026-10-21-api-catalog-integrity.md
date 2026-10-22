# Integridad del catálogo en la API

**Released:** 2026-10-21

## Summary

Correcciones del catálogo y de la administración encontradas por la nueva cobertura de endpoints: errores 500 que pasan a ser 4xx, borrados de registros inexistentes que respondían 204, validaciones de rango que faltaban y consultas que devolvían resultados incorrectos. Además, la edición de un juego pasa a ser atómica y el borrado duro de un juego en uso queda bloqueado para no dejar inconsistencias.

## Highlights

- `PATCH /games/:id` corre en una transacción; un fallo a mitad no deja la edición parcial.
- `DELETE /games/:id?hard=true` responde 409 `GAME_IN_USE` si el juego tiene datos de usuario o variantes; los reportes se borran con el juego.
- Los scores van de 0 a la `scale` de su fuente (`GAME_SCORE_OUT_OF_RANGE`) y las duraciones deben ser mayores que 0.
- `min_score` y `max_score` comparan contra el score canónico normalizado a 0-5, igual que el orden por score.

## Fixed

- `games`: `PATCH /games/:id` con un título duplicado responde 409 `GAME_UNIQUE_CONSTRAINT`; `DELETE /games/:id` de un juego inexistente responde 404 `GAME_NOT_FOUND` y no audita.
- `games`: `GET /games/latest-reviewed` valida `limit` (1-50, por defecto 16) y lo aplica después de descartar los juegos inactivos.
- `games`: `force_rawg` y `local_only` de `GET /games/search` usan `z.stringbool()`; `"false"` ya no se lee como verdadero.
- `games`: `GET /genres/:code/games` devuelve todos los géneros de cada juego y ordena por título e id para una paginación estable.
- `jobs`: `DELETE /admin/jobs/:jobId` valida el UUID y responde 422.
- `genres`: renombrar a un nombre existente responde 409 `GENRE_UNIQUE_CONSTRAINT`, un nombre sin slug responde 400 `GENRE_VALIDATION_ERROR` y borrar uno inexistente responde 404 `GENRE_NOT_FOUND`.
- `platforms`: borrar una plataforma inexistente responde 404 `PLATFORM_NOT_FOUND`.
- `game-reports`: el mensaje se recorta antes de validar su largo y se guarda recortado.

## Added

- `game-scores`: código `GAME_SCORE_OUT_OF_RANGE` (422) en las 3 capas, validado en `createGameScore`, `updateGameScore` y `replaceGameScores`.
- `game-platform`, `game-genre` y `game-external`: parámetro opcional `transaction` en `replaceGamePlatforms`, `replaceGameGenres` y `upsert`.

## Changed

- `games`: `hardDeleteGame` comprueba el uso con consultas explícitas dentro de una transacción antes del `destroy`; los datos de catálogo del juego no cuentan como uso.
- `games`: `POST /games` acepta un score de 0.
- `game-scores` y `game-times`: `score` con mínimo 0 y `duration` positiva en alta, edición y reemplazo masivo.
- `docs/invariants.md`: rangos válidos, géneros y plataformas, búsqueda de juegos, edición y borrado de juegos, y jobs.
- Colección Bruno: `games`, `genres`, `platforms`, `game-scores`, `game-times`, `jobs/cancel.yml`, `game-reports/create.yml` y el nuevo `games/latest-reviewed.yml`.

## Files of interest

- `apps/api/src/games/games.service.ts` (`updateGame`, `hardDeleteGame`, `isGameInUse`)
- `apps/api/src/games/utils/search-filters.util.ts` (`buildCanonicalScoreCondition`)
- `apps/api/src/games/services/games-search.service.ts`
- `apps/api/src/game-scores/game-scores.service.ts` (`assertScoreWithinSourceScale`)
- `apps/api/src/genres/genres.service.ts`

## Commits

- `e1bfe019` — fix(games): map title conflicts on update and reject deactivating unknown games
- `156339be` — fix(games): validate latest-reviewed limit and apply it after dropping inactive games
- `798d688a` — fix(games): parse force_rawg and local_only as booleans
- `d736ad22` — fix(games): normalize score filters and keep all genres in the genre listing
- `d4c17d66` — docs(invariants): document games query and update fixes
- `c6db003d` — fix(jobs): validate job id param on cancel
- `a4990371` — fix(genres): map duplicate rename, empty slug and missing genre on delete
- `82c264f1` — fix(platforms): answer 404 when deleting an unknown platform
- `75abbaf4` — fix(game-scores): validate score range against the source scale
- `dfa54e72` — fix(game-times): require positive durations
- `785837cd` — test(api): cover admin catalog validation fixes
- `47d0e8f5` — docs(invariants): document score ranges, genre validation and job id param
- `6a2d78b6` — fix(games): order games by genre deterministically for stable pagination
- `d5fa30ef` — refactor(games): accept an optional transaction in platform, genre and external id replacements
- `d980bd13` — fix(games): make game update atomic and block hard delete of games in use
- `30587213` — fix(games): accept a score of 0 when registering a game
- `decf9772` — test(api): cover atomic game update, hard delete guard and score 0
- `f9826d74` — docs(games): document atomic update, hard delete guard and score range
- `6c3f3949` — fix(game-reports): trim report message before validating its length
