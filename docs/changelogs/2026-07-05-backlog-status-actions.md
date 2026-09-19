# Acciones de estado en el backlog

**Released:** 2026-07-05

## Summary

Las etiquetas y colores de los estados del backlog estaban duplicados en cada vista. Se centralizan en un util compartido, que alimenta dos cosas nuevas: una acción para empezar un juego pendiente con un botón de play sobre la portada, y un panel "Your runs" en la ficha del juego para abrir las runs del usuario.

## Added

- Util `shared/utils/backlog-status.ts` con etiquetas y colores de estado.
- Acción de iniciar un juego, primero en el menú y luego como botón de play sobre la portada; opciones de estado con color.
- Panel "Your runs" en `game-detail` para abrir cada run del backlog.

## Changed

- `backlog-list`, `backlog-modal`, `queue-add-modal` y los chips de estado de las vistas guardadas usan el util compartido.

## Fixed

- La portada en la vista diario mantiene tamaño fijo y queda centrada verticalmente.

## Files of interest

- `apps/web/src/app/shared/utils/backlog-status.ts`
- `apps/web/src/app/features/games/game-detail/game-detail.html`

## Commits

- `d3f505f4` — refactor(shared): add backlog status label helpers
- `ae4877a8` — feat(game-detail): add your-runs panel to open backlog runs
- `c649e94f` — feat(backlog): add start action and colored status options
- `2973874d` — refactor(backlog): use shared status util in backlog list
- `c9c24ad4` — refactor(backlog): use shared status util in backlog modal
- `6547ec35` — refactor(queue): use shared status util in add-to-queue modal
- `cff57fda` — refactor(backlog): align saved-view status chips with shared util
- `d403f71b` — feat(backlog): move start action to play button on game cover
- `397e38de` — fix(backlog): keep diary cover at fixed size, vertically centered
