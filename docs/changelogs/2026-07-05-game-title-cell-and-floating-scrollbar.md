# Celda de título y scroll horizontal flotante

**Released:** 2026-07-05

## Summary

Las tablas anchas (shelf y la vista hardcore del backlog) repetían el markup de la celda de título y obligaban a bajar hasta el final para hacer scroll horizontal. Se extrae un componente compartido `game-title-cell` y una directiva que muestra una barra de scroll horizontal flotante mientras la tabla está en pantalla.

## Added

- Componente `game-title-cell`, usado en la tabla del shelf y en la vista hardcore del backlog.
- Directiva `floating-x-scrollbar`.

## Fixed

- `main` suma `min-w-0` para que el contenido ancho pueda hacer scroll.
- La tabla hardcore vuelve a mostrar su scrollbar horizontal.
- La directiva deja de declarar una función de teardown vacía.

## Files of interest

- `apps/web/src/app/shared/components/game-title-cell/game-title-cell.ts`
- `apps/web/src/app/shared/directives/floating-x-scrollbar.ts`

## Commits

- `9b78720d` — feat(ui): add shared game-title-cell and use it in shelf table
- `c15b8bfe` — feat(ui): add floating horizontal scrollbar directive
- `82c250ef` — feat(backlog): adopt title cell and floating scrollbar in hardcore view
- `bcf0465b` — fix(scrollbar): remove empty default teardown function
- `c8a5ebb8` — fix(layout): add min-w-0 to main so wide content can scroll
- `46903507` — fix(backlog): show horizontal scrollbar on hardcore table
