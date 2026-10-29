# Resumen IA del Rewind basado en patrones

**Released:** 2026-10-29

## Summary

El resumen con IA del Rewind repetía lo que la página ya muestra: totales, tasa de finalización, género y mes destacados. Al pedirle patrones, el modelo inventaba comparaciones que los datos contradecían ("lo largo se abandona" con juegos de 40 horas terminados), porque sin razonamiento no compara números de forma confiable sobre decenas de filas. Ahora el código calcula los agregados y la IA solo los interpreta. La entrada suma `patterns`: estadísticas exactas por género, plataforma, tramo de duración y trimestre, cada grupo con sus títulos, más cierres del mismo día, abandonos rápidos, terminados lentos y juegos de años anteriores. Cada fila trae además `ratingVsCritics` y `daysToFinish` ya calculados. El prompt pasa a buscar contrastes y cambios a lo largo del año, prohíbe repetir lo que la página ya muestra y obliga a apoyar cada comparación en esos agregados. Lo probamos contra datos reales en dev.

## Highlights

- `buildRewindRecapPatterns` (`rewind-recap/utils/build-rewind-recap-patterns.util.ts`), pura y con tests, deja fuera de los agregados los cierres importados del 1 de enero sin `startedAt` y los cuenta en `importedCloses`.
- Prompt nuevo:
    - catálogo de insights redefinido como patrones;
    - ejemplos de respuestas buenas y malas;
    - verificación de contraejemplos;
    - los ejemplos de cada grupo solo pueden salir de sus `finishedTitles` y `abandonedTitles`;
    - decimales con el separador del idioma.
- Si la salida no pasa la validación, el log del Rewind registra los motivos de zod.

## Changed

- `REWIND_RECAP_GAME_COLUMNS` suma `ratingVsCritics` y `daysToFinish`.
- El cuerpo de cada insight pasa a 220 caracteres en el prompt y 300 en zod: con la evidencia exigida, 160 y 200 hacían fallar un tercio de las generaciones.
- La temperatura del resumen baja de 0.8 a 0.5.
- La etiqueta del insight `long-vs-short` en la web pasa a "Game length" / "Duración de tus juegos": "Largos vs. cortos" se podía malinterpretar.

## Files of interest

- `apps/api/src/rewind-recap/rewind-recap.prompt.ts`
- `apps/api/src/rewind-recap/utils/build-rewind-recap-patterns.util.ts`
- `apps/api/src/rewind-recap/utils/build-rewind-recap-content.util.ts`

## Commits

- `dcf4fbc8` — feat(rewind-recap): compute exact recap patterns and per-game gaps for the ai input
- `a0f4dc97` — feat(rewind-recap): rewrite the recap prompt to find patterns backed by computed aggregates
- `0e859c31` — feat(rewind): log the validation reasons when the ai recap fails
- `e0768679` — docs(api): document the ai recap input and failure logging
- `b4f2fff9` — fix(rewind): rename the game length insight label so it reads clearly
