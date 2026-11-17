# Directiva de scroll de página y enlace para saltar al contenido

**Released:** 2026-11-16

## Summary

La app hace scroll dentro de `main.page-scroller`, y `withInMemoryScrolling` del router solo mueve la ventana, así que las páginas abrían a mitad de camino y el botón atrás no devolvía a donde estaba el usuario. Se agrega la directiva compartida `appPageScroller`, que lleva el contenedor arriba en cada navegación nueva, restaura la posición al volver con atrás o adelante, deja las URL con fragmento a la lógica de anclas de la página y no mueve el scroll cuando solo cambian los query params de la misma ruta (filtros, pestañas). Junto con el nuevo `app-skip-link` la usan los dos layouts, `layout` y `guest-shell`, para que no vuelvan a separarse. Esto reemplaza el arreglo anterior, que solo cubría la vista sin sesión (ver [`2026-11-16-guest-page-scroller.md`](2026-11-16-guest-page-scroller.md)).

## Highlights

- Una sola directiva de scroll para la vista con sesión y la vista sin sesión.
- Al volver con atrás o adelante se recupera la posición, incluso si la página de arriba sigue cargando.
- Enlace "Skip to content" que enfoca el contenido principal.

## Added

- `appPageScroller` (`apps/web/src/app/layout/page-scroller/page-scroller.ts`) con `scroll-position-memory.ts` para recordar la posición por entrada del historial y `restore-scroll-position.ts` para restaurarla.
- `app-skip-link` (`apps/web/src/app/layout/skip-link/skip-link.ts`): enlace oculto que aparece al recibir foco y enfoca `MAIN_CONTENT_ID`; un clic con modificador o botón distinto del principal sigue el comportamiento normal del navegador.
- Specs de la directiva, de la memoria de posiciones y del enlace.

## Changed

- `layout` y `guest-shell` usan `appPageScroller` y `app-skip-link` en lugar de su lógica propia.
- `restoreScrollPosition` mantiene la posición restaurada hasta 3 s o hasta el primer gesto del usuario (`wheel`, `touchstart`, `pointerdown`, `keydown`) y ya no se da por terminada al alcanzar el objetivo, y desactiva `overflow-anchor` mientras restaura. En móvil, al volver al perfil la posición saltaba unos 1000 px porque el contenido de arriba seguía cargando.
- `docs/rules.md` documenta que el scroll de la página lo maneja la directiva y no el router. Esa misma entrada del archivo cubre la regla del arte de los juegos y las señales del recap, que se describen en sus changelogs.

## Files of interest

- `apps/web/src/app/layout/page-scroller/page-scroller.ts`
- `apps/web/src/app/layout/page-scroller/restore-scroll-position.ts`
- `apps/web/src/app/layout/skip-link/skip-link.ts`
- `apps/web/src/app/layout/layout.html`
- `apps/web/src/app/layout/guest-shell/guest-shell.ts`

## Commits

- `4e0e09bf` — feat(web): add a page scroller directive that resets and restores scroll on navigation
- `584ed294` — feat(web): add a shared skip link that focuses the main content
- `cd960cef` — fix(web): use the shared page scroller and skip link in both shells so pages open at the top
- `0dd3f931` — fix(web): hold the restored scroll position while the page above keeps loading
- `76d0aea4` — docs(rules): document the page scroller, the game art rule and the new recap signals
