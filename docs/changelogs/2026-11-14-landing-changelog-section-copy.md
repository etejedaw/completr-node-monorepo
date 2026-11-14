# Sección de novedades de la landing centrada en los usuarios

**Released:** 2026-11-14

## Summary

La sección `#changelog` de la home mostraba "N días desde el último" release, calculado con `Date.now()` en el frontmatter de `Changelog.astro`. La landing es estática, así que el valor quedaba fijo en la fecha del build: producción mostró "1 día" durante toda la semana siguiente al deploy. Además, el copy ("Cada semana entran funciones…") prometía un ritmo de entregas que ya no corresponde a la v1. La sección pasa a hablar de un producto mantenido que crece con el feedback de quienes lo usan, y el tercer stat muestra la versión actual, que sí es correcta en el build porque solo cambia con un deploy.

## Highlights

- Badge "Mantenido activamente", título "Crece con quienes lo usan." y una bajada que cuenta que la v1.0 salió del feedback de los testers.
- Stats: releases, semanas de desarrollo y versión actual (`v1.0`).
- La sección no tiene ningún valor que dependa de la fecha del build.

## Changed

- `Changelog.astro` importa `version` del `package.json` de la raíz y lo muestra como `vMAYOR.MENOR`.

## Removed

- `daysSince()` y el stat "días desde el último" / "Hoy".

## Files of interest

- `apps/landing/src/components/Changelog.astro`

## Commits

- `7d445ac9` — feat(landing): reframe changelog section around users and show current version
