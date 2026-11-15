# Ajustes: área táctil de los interruptores y fixtures de listas

**Released:** 2026-11-15

## Summary

Dos arreglos independientes que salieron al probar el Rewind. Los interruptores de la app tenían un área táctil de 31×17 px en pantallas táctiles; `UiSwitch` suma la utilidad `tap-area` y llega a 44×44 en todos los lugares donde se usa. Por otro lado, dos archivos de tests de integración armaban su fixture en un `before` de nivel raíz que corría en paralelo con el truncado de `useTestDatabase`, y cancelaban sus tests de forma intermitente.

## Fixed

- `UiSwitch`: el botón del interruptor usa `tap-area`.
- `users-lists-pagination.integration.test.ts` y `lists-visibility.integration.test.ts` arman el fixture dentro del `seed` de `useTestDatabase`, después del truncado.

## Commits

- `d2b64e69` — fix(ui): extend the switch touch area on touch screens
- `c9670804` — test(api): build list fixtures after truncating so root hooks do not race
