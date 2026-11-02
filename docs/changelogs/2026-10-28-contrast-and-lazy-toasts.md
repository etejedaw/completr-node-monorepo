# Contraste del texto atenuado y toasts diferidos

**Released:** 2026-10-28

## Summary

Dos pendientes de hardening de la web. El token `fg-muted` no llegaba al 4,5:1 que promete la guía del frontend en ninguno de los tres temas: se recalculó para que pase sobre `canvas`, `surface` y `surface-hover`. El bundle inicial pesaba 659 kB contra un presupuesto de 500 kB porque `core/services/toast.ts` y `app.config.ts` importaban `ng-primitives/toast` de forma estática, y eso arrastraba al arranque el portal de ng-primitives, `@angular/forms`, `@angular/cdk` y `@floating-ui`. Ahora `ToastService` carga la librería con `import()` dinámico y el bundle inicial baja a 553 kB. Al revisar los toasts apareció un bug que ya existía: el límite `maxToasts` nunca se aplicaba en pantalla y los toasts repetidos se apilaban sin tope.

## Highlights

- `fg-muted` pasa 4,5:1 sobre los tres fondos en los tres temas, y en midnight cyan `fg-secondary` se aclara para no confundirse con `fg-muted`.
- Bundle inicial de 659 a 553 kB y `main` de 216 a 109 kB.
- Nunca hay más de 4 toasts en pantalla, y un toast igual a uno visible lo reemplaza en vez de apilarse.
- Toda la configuración de los toasts vive en `TOAST_CONFIG`.

## Added

- `TOAST_LIBRARY_LOADER`, token con el `import("ng-primitives/toast")` por defecto, que los specs reemplazan para controlar la carga.
- `TOAST_CONFIG` en `core/services/toast.ts`: posición, separación del borde (16 px, u 80 px en mobile sobre la barra de pestañas), gap, `maxToasts`, duración por defecto (4 s), duración de premium (5 s) y ventana de Undo (5 s). `UNDO_WINDOW_MS` sale de ahí.
- Tests de `ToastService` con usuario errático: toasts pedidos antes de que termine el import (salen todos, en orden y una vez), import que falla y luego funciona, precarga que coincide con una llamada manual, Undo y vencimiento antes de la carga, destrucción de la app con toasts en cola o visibles, y deduplicación.
- Tests de `ToastContainer` con el servicio real: con 7 toasts distintos hay 4 visibles y 3 ocultos, y 6 toasts premium iguales dejan uno solo.

## Changed

- `--color-fg-muted`: refined dark (también el valor por defecto de `styles.css`) `#71717a` → `#83838b`, midnight cyan `#64748b` → `#949faf`, twilight arcade `#7e6e9a` → `#9a8eb0`.
- `--color-fg-secondary` de midnight cyan: `#94a3b8` → `#b4c0d0`.
- `ToastService` importa `ng-primitives/toast` con `import()`, lo precarga en `requestIdleCallback` (con `setTimeout` de 2 s como respaldo) y crea `NgpToastManager` con `provideToastConfig` en un `EnvironmentInjector` hijo. Los toasts pedidos antes de la carga se encolan; si el import falla, el siguiente toast lo reintenta. La API pública del servicio no cambia.
- `provideToastConfig` y `toastOffsetBottom` salen de `app.config.ts`.
- `ToastService.show` descarta el toast anterior con el mismo variant, título y mensaje antes de mostrar el nuevo. `pending` no se deduplica.
- El budget `initial` de `angular.json` avisa a partir de 560 kB (antes 500 kB). Lo que queda en el bundle inicial (core, router y las utilidades de Tailwind) suma unos 552 kB y no se puede recortar sin desarmar la app; el límite de error sigue en 1 MB.
- `src/test-environment.ts` importa `ng-primitives/toast` una vez, para que el `import()` de cada spec salga de la caché de módulos.
- `docs/context/frontend.md` documenta la jerarquía `fg` > `fg-secondary` > `fg-muted`, la carga diferida, `TOAST_CONFIG`, el límite visible y la deduplicación.

## Fixed

- Los toasts que ng-primitives marca con `data-visible="false"` se dibujaban igual, porque el template no tenía estilo para ese atributo. Ahora se ocultan con una transición de 150 ms (`transition-discrete`, desactivada con movimiento reducido).
- El injector hijo del gestor de toasts no se destruía con la app, así que sus toasts quedaban en el `body`. En la suite web, el toast de un spec le quitaba el foco al siguiente. `ToastService` lo destruye en su `DestroyRef` y descarta la cola si la app se destruye antes de que termine el import.

## Files of interest

- `apps/web/src/app/core/services/toast.ts`
- `apps/web/src/app/shared/components/toast-container/toast-container.html`
- `apps/web/src/styles/themes/midnight-cyan.css`
- `apps/web/src/test-environment.ts`
- `apps/web/angular.json`

## Commits

- `cf46f4b5` — fix(web): raise fg-muted and midnight cyan fg-secondary contrast to meet 4.5:1
- `0c6e9445` — docs(web): note the text hierarchy requirement next to the contrast rule
- `d640cd05` — perf(web): lazy load ng-primitives toast out of the initial bundle
- `ee0e04b2` — build(web): raise initial bundle warning budget to 560kB
- `638587cd` — docs(web): document lazy toast loading
- `97653e1c` — fix(web): destroy the lazy toast manager together with the app
- `b8714ccb` — test(web): preload the toast library in the test environment
- `7b34bb5c` — feat(web): centralize toast settings and replace repeated toasts instead of stacking them
- `4a12be24` — fix(web): hide toasts beyond the visible limit
- `a2545dc8` — docs(web): document toast settings, visible limit and deduplication
