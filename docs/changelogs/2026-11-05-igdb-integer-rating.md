# Puntuación de IGDB en enteros

**Released:** 2026-11-05

## Summary

La nota de usuarios de IGDB se guardaba redondeada a 2 decimales y el detalle del juego la mostraba así (`64.41/100`), mientras las demás fuentes de escala 100 usan enteros. El extractor pasa a redondear al entero más cercano. Los puntajes de IGDB guardados antes del cambio no se migran: se corrigen directo en la base o al volver a consultar el juego en IGDB.

## Changed

- `extractIgdbUserRating` en `games/mappers/extractors/igdb-score.extractors.ts` redondea con `Math.round` en vez de a 2 decimales; se elimina `roundToTwoDecimals`. Una nota que redondeada queda en 0 sigue siendo `no_data`.
- `docs/invariants.md` describe la regla con el redondeo a entero.

## Files of interest

- `apps/api/src/games/mappers/extractors/igdb-score.extractors.ts`
- `apps/api/test/games/igdb-to-game.mapper.unit.test.ts`

## Commits

- `40a219af` — fix(games): round the igdb user rating to an integer
- `79d17f0f` — test(games): cover the integer rounding of the igdb rating
- `f92e6bd4` — docs(api): document the integer igdb rating
