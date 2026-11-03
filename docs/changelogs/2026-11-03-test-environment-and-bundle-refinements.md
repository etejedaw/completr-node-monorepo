# Entorno de tests y presupuesto del bundle

**Released:** 2026-11-03

## Summary

jsdom no implementa `scrollIntoView`, `scrollBy` ni `scrollTo` de elemento. Un test de My Games enfocaba un campo con `scrollIntoView` y Angular imprimía el `TypeError` sin hacer fallar el test, así que esa parte del flujo no se probaba. El entorno común de los tests los define como métodos sin efecto. Aparte, el bundle inicial creció 1,3 kB de CSS por las piezas nuevas (el JavaScript inicial no cambió) y el aviso del presupuesto pasa de 560 a 565 kB.

## Changed

- `src/test-environment.ts`: `scrollIntoView`, `scrollBy` y `scrollTo` en `Element.prototype`, escribibles para que un spec los reemplace con su propio doble.
- `apps/web/angular.json`: `maximumWarning` del bundle inicial en 565 kB (560,46 kB actuales, de los que 199,51 kB son CSS).

## Files of interest

- `apps/web/src/test-environment.ts`
- `apps/web/angular.json`

## Commits

- `d6e7e667` — test(web): shim scroll into view in the shared jsdom test environment
- `9996e31c` — test(web): shim element scroll by and scroll to in the shared test environment
- `674098f1` — test(web): keep the scroll shims writable so specs can replace them
- `03f0534a` — build(web): raise the initial bundle budget warning to 565kB
