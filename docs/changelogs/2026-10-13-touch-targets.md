# Objetivos táctiles en pantallas pequeñas

**Released:** 2026-10-13

## Summary

Los botones y enlaces pequeños de la app web alcanzan los 44 px de alto también en pantallas angostas con mouse, no solo en dispositivos táctiles. Antes el tamaño mínimo dependía de la variante `pointer-coarse:`, que no se activa en un navegador de escritorio con la ventana reducida. Se introduce la variante de Tailwind `tap:`, que aplica con `max-width: 639px` o con puntero grueso, y se reemplaza `pointer-coarse:` en los tamaños. Es solo frontend.

## Added

- Variante `tap:` en `styles.css` (`@custom-variant tap`), con `@media (max-width: 639px), (pointer: coarse)`.

## Changed

- La regla `.tap-area::after` de `styles.css` usa la misma condición que `tap:`.
- Los tamaños mínimos y paddings que usaban `pointer-coarse:` pasan a `tap:` en 41 plantillas y componentes: backlog (calendario, lista, modal, vistas guardadas), detalle de juego, browse, listas, queue, tags, perfil público, feed, shelf, layout, búsqueda global y componentes compartidos como `segmented-control`, `option-picker`, `ui-pagination`, `month-calendar` y `ui-dialog`.

## Fixed

- El botón de `profile-sagas` y los enlaces de `attribution-footer` no llegaban a 44 px de alto en pantallas angostas con mouse.

## Files of interest

- `apps/web/src/styles.css` — variante `tap` y regla `.tap-area`.
- `apps/web/src/app/shared/components/attribution-footer/attribution-footer.ts`

## Commits

- `554cc667` — fix(web): enlarge touch targets on small screens
- `38ed35ee` — refactor(web): use tap variant for touch target breakpoints
