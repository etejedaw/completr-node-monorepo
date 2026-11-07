# Rango de duración calculado en el recap del Rewind

**Released:** 2026-11-07

## Summary

El modelo llamaba "largos" a juegos de 18 horas aunque el prompt fija el corte en 30, porque tenía que comparar las horas por su cuenta. Cada fila de la entrada de la IA lleva ahora `lengthRange`, calculado en el código con los mismos rangos que `byLength`, y el prompt pide decidir si un juego es corto o largo solo por esa columna. Sigue la regla de que la IA recibe cálculos y no los hace.

## Added

- Columna `lengthRange` en las filas de `games`, entre `estimatedHours` y `paceVsEstimate`. Sale de `realHours`, o de `estimatedHours` si no hay horas reales, y es `null` sin ninguna de las dos.

## Changed

- `build-rewind-recap-patterns.util.ts` exporta `lengthRangeOf`, que también usa `byLength`, para que la columna y los agregados no puedan divergir.
- El prompt define corto como `"under 5 hours"` y largo como `"over 30 hours"`, aclara que los rangos intermedios no son ni una cosa ni la otra y prohíbe deducir la duración a partir de las horas.

## Files of interest

- `apps/api/src/rewind-recap/utils/build-rewind-recap-patterns.util.ts`
- `apps/api/src/rewind-recap/utils/build-rewind-recap-content.util.ts`
- `apps/api/src/rewind-recap/rewind-recap.prompt.ts`

## Commits

- `d9377204` — fix(api): send each game's length range to the rewind ai recap
