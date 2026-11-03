# Limpieza de restos previos a la v0.5

**Released:** 2026-11-03

## Summary

Una auditoría de toda la web encontró código muerto y piezas armadas a mano que duplicaban componentes de la v0.5: un menú de estado propio copiado en la tabla Hardcore y en la tarjeta del Diary (con su hoja de mobile y una directiva de teclado), hojas de acciones con filas copiadas, unas 35 insignias, botones de acción con clases largas, tablas sin `uiTable`, esqueletos y avisos a mano y unos 90 eyebrows repetidos. Primero se crearon las piezas compartidas que faltaban y después cada área las adoptó; una segunda ronda amplió esas piezas con lo que las vistas todavía simulaban con overrides. Es solo frontend: el endpoint `POST /auth/register` de la API se mantiene.

## Highlights

- Cambiar de estado en My Games usa `BacklogStatusPicker`: menú en escritorio y hoja en mobile.
- `BacklogStatusBadge`, `uiFiltersButton`, la variante `glass` y `GamePoster framed` reemplazan lo que cada vista armaba por su cuenta.
- La búsqueda de mobile atrapa y devuelve el foco.
- Se borran la página de registro, cuatro piezas de `shared/ui` sin uso y el CSS y las variables viejas.

## Added

- `BacklogStatusBadge` (`shared/components/backlog-status-badge`) y `BacklogStatusPicker` (`shared/components/backlog-status-picker`).
- `uiFiltersButton` (`shared/ui/button/ui-filters-button.ts`): ícono `tune`, contador, nombre accesible "Filters, N active" y altura de barra.
- `FilterChip` (`button[appFilterChip]`), compartido por `ChipGroup`, `PlatformFilter` y `BacklogStatusPills`.
- `uiButton` `variant="glass"` y `uiIconButton` `glass` para los controles sobre un héroe; `GamePoster` `framed`.
- `UiBadge`: tonos `rating`, `platinum`, `accent` y sólido de marca. `UiAlert`: tono `premium` y `role`. `ActionMenu`: variante `ghost`, `count` y `active`. `UiPlainEmptyState`: `headingLevel`. `UiTable`: filas enmarcadas y `th[data-align="end"]`. `LibraryHero`: `backLink`.
- `SegmentedControl`: `iconOnly` y `semantics` (`radio` o `toggle`); `ViewModeToggle` se construye sobre él.
- `MobileSearchOverlay` (`layout/mobile-search-overlay`), con foco atrapado y foco devuelto.

## Changed

- Tabla Hardcore y tarjeta del Diary: `BacklogStatusPicker`. Hojas de acciones de Up Next, Saved Views, la hoja "Filters & stats" de My Games, Lists y Tags: `ActionMenu`.
- Tablas de My Games, My Shelf y Platinums con `uiTable`; botones de filas con `uiIconButton`; pastillas de estado con `BacklogStatusBadge`.
- Browse y la biblioteca pública con `LibraryToolbar`; las colecciones públicas, el archivo del Rewind y el detalle de lista usan `backLink`.
- La X de cerrar de `UiDialog`, `UiDrawer`, `UiBottomSheet` y los toasts pasa a `uiIconButton`; el rol del usuario en el layout y en el perfil, a `UiBadge`.
- Esqueletos con `ui-skeleton`, avisos con `ui-alert`, vacíos con las piezas de estado vacío y eyebrows de sección con `uiEyebrow` en todas las áreas.
- Checkboxes de "Add to list" y "Duplicate list" con `ui-checkbox`; colores `rgba` y `text-red-300` pasan a tokens.
- Settings → Security confirma cerrar sesión en otros dispositivos con un `UiDialog` `tone="danger"`.

## Removed

- `features/auth/register/` (la ruta `/register` solo redirige con su guard), `AuthService.register()` y `RegisterRequest`.
- `UiRadio*`, `UiTooltipContent` y `.ui-tooltip`, `UiError`, `isGamePlatinumed`, `backlogStatusClass` y `RoleBadge.className`.
- `features/backlog/components/entry-status-sheet` y la directiva `MenuKeyboard` (`shared/directives/menu-keyboard.ts`).
- CSS sin uso de `styles.css` (`.modal-overlay`, `.empty-title`, `.empty-hint`, `.ui-stagger`) y nueve variables legacy.
- Exports sin uso: `PublicQueue`, `PublicGameShelf`, `PaginatedResult`, `pluralize`, `REWIND_PERSONAS` y `RewindGenerateFlow`.

## Fixed

- `uiFiltersButton` solo con ícono mide 44px de ancho en pantallas angostas.

## Files of interest

- `apps/web/src/app/shared/components/backlog-status-picker/backlog-status-picker.ts`
- `apps/web/src/app/shared/components/backlog-status-badge/backlog-status-badge.ts`
- `apps/web/src/app/shared/ui/button/ui-filters-button.ts`
- `apps/web/src/app/layout/mobile-search-overlay/`
- `apps/web/src/app/features/backlog/components/backlog-table/backlog-table.html`
- `docs/context/frontend.md`

## Commits

- `3a32dc8c` — refactor(auth): remove the unused register page and service method
- `7504d3ae` — feat(ui): add glass variant, active state and circle icon buttons
- `9622fd22` — feat(ui): add a shared toolbar filters button
- `3793a887` — refactor(ui): remove unused radio, tooltip and error pieces
- `c88a361f` — feat(ui): add backlog status badge with status tones
- `8954abb2` — feat(ui): add backlog status picker with menu and bottom sheet
- `08e8c72d` — refactor(ui): use the icon button for dialog, drawer, sheet and toast close
- `ea0a0a9e` — feat(ui): add a framed cover ring to game poster
- `99760714` — refactor(ui): share the filter chip across chip group, platform and status pills
- `fc54d970` — refactor(ui): build the view mode toggle on the segmented control
- `4a5f0fb4` — refactor(ui): use the glass variant for hero action menus
- `49e42cc2` — refactor(web): remove the unused platinumed game helper
- `b09679bb` — refactor(layout): trap focus in mobile search and move shell controls to ui pieces
- `7d02cb32` — refactor(web): remove unused global css and legacy variables
- `2811bc17` — docs(web): document the new shared ui pieces
- `dd731a21` — refactor(backlog): use the shared status picker in the hardcore table and diary card
- `786dd806` — refactor(queue): move row actions and notices to shared ui pieces
- `78f47d58` — refactor(backlog): move saved view actions to the action menu and filters to badges
- `bc9b7d35` — refactor(backlog): use shared badges, alerts and eyebrows in the entry modal and stats
- `1966fcf2` — refactor(web): move the shelf and platinum tables to ui table
- `554313d8` — refactor(web): use the glass variant and hero eyebrow in favorites and want to get
- `5643ef2f` — refactor(games): move browse header, toolbar, filters and empty states to shared ui pieces
- `7c62de40` — refactor(games): use framed posters and the plain empty state in the game editor
- `6385d6c6` — refactor(games): move game detail badges, buttons, eyebrows and checkbox to shared ui pieces
- `0541b20f` — refactor(public-profile): remove unused public library and pagination types
- `c60fc316` — refactor(public-profile): move profile toolbar, role badge, hero buttons and eyebrows to shared ui pieces
- `3960463b` — refactor(lists): use the action menu, checkbox, skeleton and eyebrow pieces
- `ab2d6e2e` — refactor(tags): use the action menu and badge for row actions
- `89b8c4bf` — refactor(settings): use the alert, badge, skeleton and icon button pieces
- `de924603` — refactor(franchises): use the glass button for track and the skeleton piece
- `2c287f82` — refactor(admin): use the filters button, glass refresh, alert and empty state pieces
- `1c622cb7` — refactor(whats-new): use the badge, eyebrow and empty state pieces
- `002d7fd1` — refactor(help): use the backlog status badge and glass hero button
- `82aaf92e` — refactor(web): use the badge, eyebrow and glass hero button on about and privacy
- `f5d575df` — refactor(users): use the badge and eyebrow pieces on the user card and discover
- `810c9015` — refactor(web): use the framed poster ring and eyebrow in feed and auth showcase
- `a8b4987b` — refactor(rewind): remove unused pluralize, personas and flow type exports
- `1ab76a5b` — feat(web): add rating, platinum, accent and solid brand badge tones
- `8abb31d5` — feat(web): add a glass variant to the icon button for hero controls
- `c8c8302e` — feat(web): add a premium tone and role override to the alert
- `cf492def` — feat(web): add a ghost variant and active count to the action menu
- `4caa87d0` — refactor(backlog): replace the filters and stats sheet with the action menu
- `93436324` — feat(web): add framed rows and data-driven header alignment to the table
- `46b12276` — feat(web): add heading level and inset padding to the plain empty state
- `e3fb04ed` — feat(web): add a back link and eyebrow input usage to the library hero
- `497f073e` — refactor(settings): confirm signing out other devices with a danger dialog
- `941dacbe` — refactor(web): remove the unused backlog status class and role badge class
- `5f69a551` — fix(web): give the icon-only filters button a 44px minimum width
- `eefa0a96` — docs(web): document the new shared piece options in the frontend guide
