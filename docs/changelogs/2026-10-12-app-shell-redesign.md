# Rediseño del app shell y base táctil

**Released:** 2026-10-12

## Summary

El layout autenticado se rehace con un top bar que incluye búsqueda global, y se prepara la base de interacción para móvil: servicios de puntero y viewport, directiva de swipe, hoja inferior y objetivos táctiles ampliados en punteros gruesos. También se renueva la pantalla de login con una vitrina animada y el layout de invitados recibe top bar y contenedor de página. Es solo frontend (`apps/web`); no cambia la API.

## Highlights

- Búsqueda global en el top bar (`layout/global-search`) y `layout.html` reescrito.
- Primitivas móviles reutilizables: `ui-bottom-sheet`, directiva `swipe-actions` y servicios `pointer` y `viewport`.
- Login con vitrina animada (`features/auth/auth-showcase`).
- Componente compartido `game-poster`, usado por `game-title-cell`.

## Added

- Componente `GlobalSearch` (`layout/global-search/`) montado en el top bar.
- Componente `ui-bottom-sheet` exportado desde `shared/ui`.
- Directiva `swipe-actions` (`shared/directives/`) y servicio `pointer` (`core/services/`) para detectar punteros gruesos.
- Directiva `in-view` (`shared/directives/`) y servicio `viewport` (`core/services/`).
- Componente `game-poster` (`shared/components/`), con `game-title-cell` migrado a él.
- Componente `AuthShowcase` en la pantalla de login.
- Top bar y contenedor de página en `guest-shell`.

## Changed

- `layout.html` y `layout.ts` se reescriben para el nuevo shell; el feed pierde el bloque de cabecera que ahora vive en el layout.
- Los heroes de página sobresalen del padding de página en My Games, detalle de juego y exploración de juegos.
- Los toasts se muestran por encima de la barra de pestañas móvil (`app.config.ts`).
- El botón de novedades solo se muestra en el feed.
- Los botones de cabecera, las pestañas y los controles de feed, detalle, exploración, Up Next y paginación suben a tamaño táctil en punteros gruesos.
- El layout usa `class` en lugar de `ngClass` para los enlaces de clases.
- El scroller de página deja de usar `isolate`.

## Files of interest

- `apps/web/src/app/layout/layout.html` — estructura del shell, top bar y barra móvil.
- `apps/web/src/app/layout/global-search/global-search.ts` — búsqueda global.
- `apps/web/src/app/shared/directives/swipe-actions.ts` — gestos de swipe.
- `apps/web/src/app/shared/ui/bottom-sheet/ui-bottom-sheet.ts` — hoja inferior.
- `apps/web/src/app/features/auth/auth-showcase/auth-showcase.ts` — vitrina del login.

## Commits

- `bdf21531` — feat(web): add game poster component and use it in title cell
- `6f414478` — feat(web): add animated auth showcase to login page
- `3841210c` — feat(web): add pointer service and swipe actions directive
- `e625bd8e` — feat(ui): add bottom sheet component
- `8946f814` — feat(layout): add global search to top bar and rework app shell
- `6221b255` — style(web): bleed page heroes past the page padding
- `a800cb6d` — fix(web): keep toasts above the mobile tab bar
- `82375904` — feat(layout): show what's new button only on the feed
- `5323c332` — refactor(layout): bind classes with class instead of ngClass
- `78a6e94c` — feat(web): add in-view directive
- `efe575a2` — feat(web): add viewport service
- `2a90b10b` — style(layout): drop isolate from page scroller
- `f9310189` — style(web): enlarge touch targets on coarse pointers
- `ea914ab9` — style(ui): enlarge tabs on coarse pointers
- `1109ed99` — feat(layout): add topbar and page shell to guest layout
- `08197a95` — style(web): raise header buttons to touch target size
