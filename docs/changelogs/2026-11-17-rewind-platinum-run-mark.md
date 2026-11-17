# Marca de platino en la run exacta de los juegos terminados

**Released:** 2026-11-17

## Summary

Los estantes de terminados del 2025 y los cerrados del 2026 marcan con un trofeo el juego platinado. Cada lista muestra solo la última run del año de cada juego, así que marcar por `gameId` ponía el trofeo en una run que no lo ganó (platino de una run anterior) o en cualquier run (platino guardado sin run). La API calcula `isPlatinumRun` en cada entrada de `finishedGames` y `abandonedGames` comparando el id de la run con el `backlogId` del platino, sin devolver ids de runs, y la web marca solo esas entradas.

## Added

- API: `isPlatinumRun` en `finishedGames` y `abandonedGames` (`RewindClosedGame`), en vivo y en las fotos congeladas. Es `false` sin acceso a los platinos, para un platino sin run y en fotos congeladas antes de guardar las runs.
- Las fotos congeladas guardan el `backlogId` de cada juego y de cada platino solo para esta comparación; el serializer no los expone.
- Web: insignia de platino en `rewind-2025-shelves` y en los terminados de `rewind-2026-closed-games`.

## Fixed

- En teléfono, el texto accesible de la insignia del 2025 quedaba fuera de su fila deslizable y ensanchaba la página.

## Migration

- Las fotos congeladas antes de este cambio no marcan ninguna run hasta que se vuelvan a congelar.

## Commits

- `12482231` — feat(rewind): mark the platinumed finished games in the 2025 shelves and the 2026 closed games
- `4304dcaf` — feat(rewind): flag the finished and abandoned runs that hold the year's platinum
- `d36d4e05` — feat(rewind): mark the platinum badge only on the exact platinumed run
- `2709980b` — docs(rules): explain why the rewind platinum mark follows the exact run
- `3cac8c80` — fix(rewind): keep the 2025 shelf platinum label inside its scrolling row on phones
