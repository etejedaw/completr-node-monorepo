# Explicación del ratio en la ayuda

**Released:** 2026-10-20

## Summary

La sección Ratio de `/help` mostraba la fórmula "Score ÷ Hours × 20" de una forma que hacía pensar que el × 20 era la conversión desde una escala de 1 a 100. El cálculo no cambia (`calculateRatio` en la API: nota normalizada a 1–5, dividida por las horas y multiplicada por 20); cambia solo cómo se explica.

## Changed

- `help-page.html`: la fórmula grande queda como "Score (1–5) ÷ Hours × 20 = Ratio". Debajo, dos bloques: las notas se normalizan a 1–5 según su escala (82/100 → 4.1, 6/7 → 4.29; las que ya están sobre 5 se usan tal cual), y el × 20 lleva el resultado a 0–100 para tener más margen al comparar.
- `backlog-reference-fields.ts`: el tooltip del ratio usa la misma explicación.

## Files of interest

- `apps/web/src/app/features/help/help-page.html`

## Commits

- `da39232e` — fix(web): explain ratio formula independently of the score scale
- `949a8e9a` — fix(web): explain ratio as score normalization followed by division by hours
- `25c9eabb` — fix(web): show ratio formula with normalized score and explain the x20 factor
