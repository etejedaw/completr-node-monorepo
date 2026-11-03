# Solo la variante filled de Material Icons

**Released:** 2026-11-02

## Summary

`styles.css` importaba `material-icons/iconfont/material-icons.css`, que declara las cinco variantes de la fuente (filled, outlined, round, sharp y two-tone), aunque la app solo usa la clase `material-icons`. Ahora importa `filled.css`, que declara únicamente esa variante con las mismas reglas. El bundle inicial pasa de 560,88 kB a 558,47 kB (de 124,45 kB a 124,17 kB comprimido) y vuelve a quedar dentro del presupuesto de 560 kB de `angular.json`, así que el aviso del build solo aparece si el bundle crece de verdad.

## Changed

- `apps/web/src/styles.css`: `@import "material-icons/iconfont/filled.css" layer(base)` en lugar de `material-icons.css`.

## Commits

- `bae8740f` — perf(web): load only the filled material icons variant
