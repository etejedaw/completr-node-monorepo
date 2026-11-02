# Gráficas free del Rewind: duración y décadas de lanzamiento

**Released:** 2026-10-29

## Summary

El Rewind suma la sección free "More of your year" / "Más de tu año", entre los highlights y las estadísticas premium, sin marco dorado, para que quien no es premium también tenga gráficas. Trae dos:

- **"¿Cuánto duraron tus juegos?":** los juegos terminados del año por tramo de horas (menos de 5, 5 a 15, 15 a 30 y más de 30), con horas reales o, si no hay, estimadas.
- **"Décadas de lanzamiento":** los juegos terminados por década de lanzamiento, con la década más jugada destacada.

Las dos se calculan en vivo desde `buildRewind` con la última run de cada juego terminado. Respetan la privacidad de quien mira, no se guardan en `Rewinds` y no hace falta regenerar.

## Added

- `Rewind.yearMix`: `lengthMix` (siempre los 4 tramos), `releaseDecades` (solo las décadas con juegos), `gamesWithoutHours` y `gamesWithoutRelease`. Constantes `REWIND_LENGTH_RANGES`, `REWIND_LENGTH_RANGE_MAX_HOURS` y `REWIND_MIN_RELEASE_YEAR`.
- `RewindRun.releaseYear`, a partir de `Game.releaseAt`. Un año anterior a 1950 o posterior al del Rewind cuenta como sin fecha.
- Componente `RewindYearMix`, bilingüe:
    - barras horizontales para los tramos y columnas por década;
    - tablas `sr-only`;
    - las dos tarjetas con el mismo alto en desktop.

## Commits

- `56d3d5e6` — feat(rewind): add live year mix with game length ranges and release decades
- `5c640c30` — test(rewind): cover year mix edges, replays and visitor privacy
- `22b6b1c9` — docs(rewind): document the year mix of the rewind detail
- `dac3c828` — feat(rewind): show free game length and release decade charts on the rewind page
