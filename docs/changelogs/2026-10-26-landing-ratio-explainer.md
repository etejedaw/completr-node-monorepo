# Explicación del Ratio en la landing

**Released:** 2026-10-26

## Summary

La sección "El Ratio" de la landing (`apps/landing/src/components/Ratio.astro`) se reescribe para explicarlo sin desmerecer los juegos largos. La fórmula queda escrita igual que en la página Help de la app (Nota (1–5) ÷ Horas × 20 = Ratio) y el ejemplo deja de comparar barras de Ratio: muestra un mes de tiempo libre con una gran aventura para las vacaciones o un juego corto cada fin de semana, los dos con la misma nota. Cada uno lleva su Ratio con el motivo (bajo porque dura mucho, alto porque se terminan pronto), para que se entienda que un Ratio bajo no significa un juego peor.

## Changed

- La fórmula sigue el orden y el estilo de Help: nota en escala 1–5, dividida por las horas y multiplicada por 20, con la explicación de la escala y del × 20. Antes decía "nota × 20 ÷ horas" y hablaba de una nota de 0 a 5.
- El título pasa a "Lo que cabe en tu tiempo" y el texto aclara que el Ratio no dice qué juego es mejor.
- El ejemplo muestra las mismas estrellas en los dos casos y una pastilla de Ratio con el mismo estilo neutro, para que el bajo no se lea como castigo. Los valores salen de la misma fórmula.
- El paso 2 ("Mira el Ratio") se explica sin cifras.

## Files of interest

- `apps/landing/src/components/Ratio.astro`

## Commits

- `7a828e75` — fix(landing): write the ratio formula like the help page
- `b6dba262` — feat(landing): explain the ratio as what fits in the same time
- `857ace5c` — feat(landing): show the same rating with a different ratio in the time example
