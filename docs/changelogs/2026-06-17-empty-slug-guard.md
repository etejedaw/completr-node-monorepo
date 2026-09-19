# Slugs vacíos en juegos

**Released:** 2026-06-17

## Summary

Un título formado solo por caracteres que `slugify` descarta generaba un slug vacío. El servicio de `games` ahora rechaza ese caso en todos los caminos que generan slug, y el editor de juegos del admin muestra el slug resultante bajo cada título de variante.

## Fixed

- `games` rechaza slugs vacíos al registrar, actualizar, crear compilaciones y separar variantes.

## Added

- Vista previa del slug bajo cada título de variante en `admin-game-editor`.

## Files of interest

- `apps/api/src/games/` — servicios de registro, variantes y compilaciones.
- `apps/web/src/app/features/games/admin-game-editor/admin-game-editor.html`

## Commits

### Backend

- `c761e232` — fix(games): reject split variants whose title slugifies to empty
- `a04a8a11` — fix(games): reject empty slug in register, update and compilation paths

### Frontend

- `4c4ce3ab` — feat(admin-games): show slug preview under split variant titles
