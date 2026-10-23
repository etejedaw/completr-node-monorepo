# Menú de estado accesible con teclado

**Released:** 2026-10-23

## Summary

El menú para cambiar el estado de una entrada en "My games" no se cerraba con Escape: el handler estaba en el contenedor del menú, pero al abrirlo con un clic el foco se quedaba en el botón. Ahora las vistas de tarjetas y de tabla siguen el patrón Menu Button de WAI-ARIA, con la lógica en una sola directiva compartida.

## Highlights

- Escape cierra el menú esté donde esté el foco y lo devuelve al botón que lo abrió.
- Al abrir, el foco pasa a la primera opción habilitada. Las flechas, Home y End recorren las opciones, y Tab cierra el menú.

## Added

- `shared/directives/menu-keyboard.ts`: directiva `MenuKeyboard` (`[appMenuKeyboard]`, input del estado abierto y output `menuClosed`). Mientras el menú está abierto registra un `keydown` en `document` para Escape y lo quita al cerrarse. Maneja flechas con vuelta al inicio, Home, End y Tab (sin `preventDefault`, dejando el foco en un lugar válido antes de que el menú salga del DOM).

## Changed

- `backlog-entry-card` y `backlog-table` usan la directiva en el contenedor del botón y del menú, y quitan el `(keydown.escape)` del `role="menu"`. El menú detiene la propagación de Enter y Space para que no activen la tarjeta (`article role="button"`).
- En puntero grueso no cambia nada: se sigue abriendo la hoja inferior de estados.

## Fixed

- Escape no cerraba el menú de estado de las tarjetas ni de la tabla.

## Files of interest

- `apps/web/src/app/shared/directives/menu-keyboard.ts`
- `apps/web/src/app/shared/components/backlog-entry-card/backlog-entry-card.html`
- `apps/web/src/app/features/backlog/components/backlog-table/backlog-table.html`

## Commits

- `b1309907` — feat(web): add menu keyboard directive for menu button focus and keys
- `0882d24d` — fix(web): close entry card status menu with escape and add arrow key navigation
- `4f4f42ea` — fix(web): close table status menu with escape and add arrow key navigation
