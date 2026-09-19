# Lint y accesibilidad del frontend

**Released:** 2026-06-26

## Summary

Pasada para dejar el frontend sin errores de lint y cerrar los hallazgos de accesibilidad de las reglas de template. El config de ESLint del frontend admite el prefijo `ui` del design system y los componentes con selector de atributo.

## Changed

- ESLint (`apps/web/eslint.config.js`, hoy unificado en la raíz): se permite el prefijo `ui` en selectores y los componentes con selector de atributo.

## Fixed

- Igualdad estricta con chequeos explícitos de `null` y `undefined` en templates y componentes.
- `alt` en imágenes, `aria-label` en controles, funciones vacías y `prefer-const`.
- Labels asociados a sus controles y `aria-labelledby` en controles custom.
- Soporte de teclado en elementos interactivos y overlays accesibles (backlog, calendario, admin).

## Files of interest

- `eslint.config.mjs`
- `apps/web/src/app/features/backlog/backlog-list/backlog-list.html`
- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.html`

## Commits

- `c2cfee36` — fix(lint): use strict equality with explicit null/undefined checks
- `d3d043cf` — fix(lint): add alt text, aria-labels and resolve empty function/prefer-const
- `22226616` — fix(a11y): associate form labels and add aria-labelledby to custom controls
- `66720ec4` — chore(lint): allow ui design-system prefix for selectors
- `2d14cb27` — chore(lint): allow ui design-system prefix and attribute-selector components
- `9193d7bb` — fix(a11y): keyboard support for interactive elements and accessible overlays
