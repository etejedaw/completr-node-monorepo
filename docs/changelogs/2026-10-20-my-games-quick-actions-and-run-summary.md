# Acciones rápidas de My Games y resumen de una run

**Released:** 2026-10-20

## Summary

Un grupo de ajustes sobre My Games y la página de juego. Up Next desde la página de juego puede usar una run que ya existe en vez de obligar a crear una nueva. La barra de My Games muestra la acción de limpiar filtros a la vista, y las runs en `playing` tienen un atajo para completarlas. La vista resumen de una run se rediseña con el arte del juego y enlaza a los perfiles de quienes jugaron con el usuario.

## Highlights

- Up Next en la página de juego: con una run `not_started` la añade directo, con varias abre un selector con la opción "New run".
- "Clear (N)" o "Exit view" en la barra de My Games, junto a Filters.
- Botón "Complete" en las cards de runs en `playing`, en escritorio y en móvil.
- Vista resumen con cabecera de arte, tarjetas Tracking y Reference, y Played with enlazado a cada perfil.

## Added

- `game-detail/queue-intent.ts`: `queueableRuns` y `resolveQueueIntent` deciden entre crear una run, añadir una directo o abrir el selector. Solo son elegibles las runs `not_started` que no estén ya en la cola, porque la cola no acepta otros estados. Con spec.
- `game-detail/components/game-queue-run-picker`: diálogo que lista las runs elegibles (estado, plataforma, número de run, fecha de inicio) y la opción "New run".
- `BacklogEntryCard`: output `completeRequested` y botón "Complete" para `playing` (sobre el póster en escritorio y en la barra inferior en móvil), oculto en modo `readonly`. Con spec.

## Changed

- `game-detail`: `addedToQueue` pasa a ser un `computed` sobre los ids de las runs del juego en la cola. Añadir una run usa `queueService.addFromBacklog`, con aviso de éxito y estado de carga que deshabilita el botón Up Next.
- `backlog-list`: la acción de limpiar sube a la barra como `clearAction` ("Clear (N)" con filtros sueltos, "Exit view" con una view aplicada). "Complete" abre el diálogo de cambio de estado existente (`selectNewStatus`), que pide fecha de fin, duración real y nota.
- `backlog-entry-summary`: cabecera con el arte del juego, póster, estado, plataforma y título enlazado a la página del juego; tarjetas Tracking (nota, horas jugadas, fechas, plataforma) y Reference (critic score, duración y `RatioSummary`); notas y reseña con `ExpandableText`. En modo resumen el diálogo se titula "Your run".
- Played with, en el resumen y en la lista de co-op del modo edición, enlaza a `/user/:username` y cierra el modal.

## Files of interest

- `apps/web/src/app/features/games/game-detail/queue-intent.ts`
- `apps/web/src/app/features/games/game-detail/components/game-queue-run-picker.ts`
- `apps/web/src/app/features/backlog/backlog-list/backlog-list.ts`
- `apps/web/src/app/shared/components/backlog-entry-card/backlog-entry-card.html`
- `apps/web/src/app/features/backlog/backlog-modal/components/backlog-entry-summary.html`

## Commits

- `430640b6` — feat(web): add queue intent resolver for game detail
- `ff62a179` — test(web): cover queue intent resolver
- `cca9e71e` — feat(web): add run picker dialog for game up next
- `52cbff89` — feat(web): add existing run to up next from game detail
- `f9072dcb` — feat(web): add quick complete action to playing backlog cards
- `b44a7048` — feat(web): move clear filters action to the backlog toolbar and wire card complete action
- `ca8c0a25` — feat(web): redesign backlog entry summary with game art header
- `93446355` — feat(web): link co-op members to their profiles in backlog modal
