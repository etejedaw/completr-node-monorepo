# Quick actions en cover cards y reorden drag-and-drop

**Released:** 2026-06-23

## Summary

Dos mejoras de UX que reducen pasos repetidos: (1) las cards de juego (`game-cover-card`) ahora exponen acciones rápidas para agregar al backlog y togglear el wishlist sin entrar a la ficha, y se cablearon en Favorites y My Shelf; (2) las vistas Up Next (queue) y List Detail soportan reorden por drag-and-drop con update optimista, usando Angular CDK. La feature usa el endpoint existente de reorden — no requiere cambios backend.

## Highlights

- Botones de "add to backlog" y "toggle wishlist" inline sobre cualquier cover de juego — antes había que abrir la ficha.
- Drag-and-drop sobre la cola Up Next con commit optimista al soltar; rollback si el server rechaza.
- Drag-and-drop en List Detail visible solo para el owner; preserva positions y refresca el backend con la nueva secuencia.
- Estilos compartidos de preview/placeholder de CDK para que todos los reordenamientos se vean igual.

## Added

- `game-cover-card` — inputs y outputs para exponer botones "add to backlog" y "wishlist toggle" cuando el host lo solicita.
- Wiring del botón quick-add en `favorites-view` y `game-shelf-list`: abre el modal de backlog precargando la entry existente del juego o cae al flow de creación si no existe.
- CDK drag-and-drop instalado para `queue-view` y `list-detail`.
- Estilos globales para `.cdk-drag-preview`, `.cdk-drag-placeholder` y la animación de drop (`style(ui)`).

## Changed

- `queue-view` reordena en cliente al soltar y dispara el PUT al backend con el nuevo array de backlogIds. Si la llamada falla, revierte el orden y muestra error.
- `list-detail` aplica el mismo patrón pero solo cuando el viewer es el owner; los items pasan a usar la `position` actualizada del cliente para evitar parpadeos.
- `queue-grid-card` recibe los handles de drag para no romper el click del card al arrastrarlo.

## Files of interest

- `src/app/features/queue/queue-view/queue-view.{ts,html}`
- `src/app/features/queue/components/queue-grid-card/queue-grid-card.ts`
- `src/app/features/lists/list-detail/list-detail.{ts,html}`
- `src/app/shared/components/game-cover-card/game-cover-card.ts`
- `src/app/features/favorites/favorites-view/favorites-view.{ts,html}`
- `src/app/features/game-shelf/game-shelf-list/game-shelf-list.{ts,html}`
- `src/app/features/whats-new/whats-new-page.ts` — entry de announcement.

## Commits

- `0e2b7026` — style(ui): add cdk drag-and-drop preview and placeholder styles
- `c1a66313` — feat(queue): enable drag-and-drop reordering with optimistic update
- `e396b3c5` — feat(lists): enable drag-and-drop reordering for list owner
- `5ddd865e` — feat(game-cover-card): expose add-to-backlog and wishlist quick action buttons
- `77bd5a39` — feat(favorites): wire quick add to backlog and wishlist toggle
- `73d45845` — feat(game-shelf): wire quick add to backlog and wishlist toggle
