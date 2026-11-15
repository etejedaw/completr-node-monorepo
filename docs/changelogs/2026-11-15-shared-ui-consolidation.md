# Consolidación de shared/ui

**Released:** 2026-11-15

## Summary

Cierre de la deuda técnica que dejó la auditoría de la web. Las piezas que el design system ya usaba como propias pasan de `shared/components` a `shared/ui` con su convención de nombres, se agregan dos componentes para reemplazar botones escritos a mano, los colores fijos que quedaban pasan a tokens y los toasts informativos ganan una acción propia, que reemplaza el uso del Undo para navegar.

## Highlights

- `UiActionMenu`, `UiOptionPicker`, `UiMultiOptionPicker`, `UiSegmentedControl`, `UiChipGroup`, `UiFilterChip` y `UiToastContainer` viven en `shared/ui`.
- `UiSwatchButton` y `UiSelectableRow` reemplazan los botones propios de vistas guardadas, Add game y el modal de runs.
- `toast.success(message, { action })`: el aviso de un Rewind generado en segundo plano lleva "View" como acción.

## Added

- `shared/ui/swatch-button`: `button[uiSwatchButton]`, muestra de color o ícono elegible con `aria-pressed` y 44 px táctil.
- `shared/ui/selectable-row`: `button[uiSelectableRow]`, fila o tarjeta completa elegible con foco visible.
- `ToastService`: `info`, `success`, `warning` y `error` aceptan `{ durationMs, action }`. La acción corre una sola vez, cierra el toast y dura `TOAST_CONFIG.actionDurationMs`; dos toasts que difieren solo en la acción no se agrupan.
- Tokens `--color-view-*` (color de una vista guardada), `--color-scrim`, `--color-scrim-strong` y `--color-scrim-badge`.
- Specs de `catalog-game-picker` y `admin-data-request-reject-dialog` con respuestas desordenadas, doble clic, teclado e input basura.

## Changed

- `action-menu`, `option-picker`, `segmented-control`, `chip-group` y `toast-container` se mudan a `shared/ui` con archivos `ui-*`, clases `Ui*` y selectores `ui-*` (`appFilterChip` pasa a `uiFilterChip`); unos 115 archivos cambian solo su import o su selector. `shared/ui/README.md` los suma al catálogo.
- `saved-filters-view` (ícono y color), `list-add-game` (filas de resultado) y `backlog-modal` (compilación y candidatos co-op) usan los componentes nuevos sin cambio visible, salvo el foco visible en las filas de Add game y el tinte de hover en los candidatos co-op.
- `saved-filter-appearance.ts` pinta con `var(--color-view-*)`; las claves guardadas no cambian. `favorite-reorder-card`, `game-cover-card` y `platinum-cover-card` usan los tokens `scrim`.
- `rewind-generate-flow` anuncia el Rewind listo con `toast.success` y la acción "View" en vez de `toast.pending`.
- `FollowState` tiene una sola definición (`inject-follow-actions.model.ts`) y `USER_DELETE_FORBIDDEN` pasa a `ADMIN_ERROR_MESSAGES` con el mismo texto.
- `eslint.config.mjs` permite selectores de atributo en `swatch-button` y `selectable-row`, como en `button` e `icon-button`.

## Commits

- `3fa50713` — refactor(web): import FollowState from the follow actions model in user-card
- `ae77748f` — refactor(web): move USER_DELETE_FORBIDDEN message to the admin error messages
- `19f556f4` — test(web): cover catalog-game-picker with erratic user interactions
- `14a594d0` — test(web): cover admin-data-request-reject-dialog with erratic user interactions
- `f232237d` — chore(repo): allow attribute selectors for swatch button and selectable row
- `8781252c` — feat(web): add swatch button and selectable row to shared ui
- `d45d0d33` — test(web): cover swatch button and selectable row
- `0067b686` — refactor(web): use swatch button and selectable row in saved views, lists and backlog modal
- `b98f1e4f` — refactor(web): move saved view colors and scrim to color tokens
- `3c4666c9` — refactor(web): move action menu, pickers, segmented control, chip group and toast container into shared ui
- `86343511` — feat(toast): add an action to informational toasts
- `d9ffe7d9` — feat(rewind): announce a background rewind with a toast action
- `1b23213f` — test(rewind): expect the toast action instead of the pending undo
- `e3974475` — refactor(web): paint cover overlays and badges with scrim tokens
