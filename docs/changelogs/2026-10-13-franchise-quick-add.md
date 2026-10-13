# Alta rápida al backlog desde franquicias

**Released:** 2026-10-13

## Summary

La página de detalle de una franquicia se rediseña con un hero y una grilla de portadas, y cada juego suma el botón para agregarlo al backlog sin salir de la página. La lógica de alta rápida que ya existía en favoritos, shelf y listas se extrae a un helper de inyección compartido, y la franquicia pasa a usarlo. Es solo frontend.

## Added

- `injectBacklogQuickAdd` (`features/backlog/backlog-quick-add.ts`): busca la entrada del juego en el backlog y abre `BacklogModal` para editarla, o para crearla con el juego preseleccionado. Recibe un callback que se ejecuta al guardar.
- Botón de agregar al backlog en cada portada de `franchise-detail`, con el estado "en backlog" según `backlogStatus`. Al guardar se recarga la página.

## Changed

- `franchise-detail` usa `LibraryHero`, `CoverGrid` y `ProgressMeter`. Carga con `rxResource` y `linkedSignal` en lugar de `ngOnInit`, y reacciona al cambio de `code` en la ruta con paginación reiniciada.
- `favorites-view`, `game-shelf-list` y `list-detail` reemplazan su copia local de la alta rápida por `injectBacklogQuickAdd`.

## Files of interest

- `apps/web/src/app/features/backlog/backlog-quick-add.ts`
- `apps/web/src/app/features/franchises/franchise-detail/franchise-detail.ts`

## Commits

- `b3e73e79` — refactor(web): redesign franchise page with hero and cover grid
- `26a84320` — refactor(web): extract backlog quick-add into shared injector helper
- `4d155325` — feat(web): add backlog quick-add to franchise detail games
