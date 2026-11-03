# Panel de admin con los componentes v0.5

**Released:** 2026-11-02

## Summary

El rediseño de Admin del 2026-10-27 había dejado los encabezados y el layout en el lenguaje v0.5, pero los formularios, los diálogos y el editor de juegos seguían con piezas anteriores, y las vistas que se sumaron después (Premium access, Promotions, External data) entraron con insignias, tablas y selectores armados a mano. Esta entrega lleva todo el admin a las piezas compartidas, agrega las tres que faltaban (`UiBadge`, `UiTable` y el input `eyebrow` de `LibraryHero`) y elimina `UiSelect`, que ya no usa ninguna vista. Es solo frontend.

## Highlights

- Insignias de estado y de rol con `UiBadge` y tablas con `uiTable` en todas las vistas de admin.
- `OptionPicker` en lugar de `<select>` en Edit user, Premium access, Promotions y el editor de juegos; `UiSelect` desaparece del design system.
- El editor de juegos busca el juego padre y los de una compilación solo en el catálogo, con esqueleto, estado vacío y teclado.
- En mobile, las filas de Users, Games, Franchises y Promotions agrupan sus acciones en un `ActionMenu` ⋮.

## Added

- `UiBadge` (`shared/ui/badge`): `tone` `neutral` / `success` / `warning` / `danger` / `info` / `brand` / `premium` / `admin` e `icon` opcional. `RoleBadge` suma `tone`.
- `UiTable` (`shared/ui/table`): directiva `table[uiTable]` con el estilo de cabeceras, filas y celdas.
- `LibraryHero`: input `eyebrow`; las vistas de admin usan `eyebrow="Admin"`.
- `CatalogGamePicker` (`features/games/admin-game-editor/catalog-game-picker.ts`): búsqueda local con `injectGameSearch`, `SelectedGameRow`, esqueleto, vacío con "New search", flechas, Escape y Enter, y exclusión del propio juego y de los ya vinculados.
- Franchises: búsqueda en el cliente con `LibraryToolbar` y `UiNoMatches`.

## Changed

- Editor de juegos: Franchise, Score source y Duration source con `OptionPicker`; DLC con `ui-switch`; plataformas y géneros con `ChipGroup`; "Link existing / Create new" con `SegmentedControl`; secciones con `FilterSection`; portadas con `GamePoster`.
- Barra de admin de la ficha del juego (`game-admin-bar`): barra neutra con "Edit game" visible y Deactivate y Delete en un `ActionMenu`, cada uno con confirmación en `UiDialog`.
- Admin → Users: Active con `ui-switch`, ojo de contraseña con `uiIconButton`, acciones de fila en un ⋮ en mobile. "Invite by email" pasa al hero como acción secundaria y la sección de invitaciones solo aparece si hay pendientes o falló la carga.
- Invitaciones: esqueleto mientras carga e insignias Pending y Expired.
- Jobs, Audit y Promotions: tablas con `uiTable` y estados con `UiBadge` (`tone` + `icon` en lugar de clases).
- External data, Franchise modal y Reports: insignias, `FilterSection` y `uiFieldLabel`.

## Removed

- `UiSelect` (`shared/ui/select`) y las reglas `.ui-select` de `styles/ui.css`.

## Fixed

- `ui-switch` no conmutaba con la barra espaciadora: `ng-primitives` 0.124 cancela el keydown de Space sobre un `<button>`. `UiSwitch` lo conmuta en `keyup.space`.
- El área táctil del interruptor (`.ui-switch__track::after`) pasa a 44px.
- Los enlaces de títulos cortos en Admin → Games y Audit tienen 44px de ancho en táctil.

## Files of interest

- `apps/web/src/app/shared/ui/badge/ui-badge.ts`
- `apps/web/src/app/shared/ui/table/ui-table.ts`
- `apps/web/src/app/features/games/admin-game-editor/catalog-game-picker.ts`
- `apps/web/src/app/features/games/game-detail/components/game-admin-bar.ts`
- `apps/web/src/app/features/admin/admin-users/admin-users.html`
- `apps/web/src/app/shared/ui/switch/ui-switch.ts`

## Commits

- `f9f6d046` — feat(ui): add badge and table primitives
- `f7561137` — feat(web): add an eyebrow input to the library hero
- `41976b17` — feat(web): give role badges a badge tone
- `4e6d26e2` — docs(web): document badge, table and hero eyebrow primitives
- `6a0bcbd7` — feat(games): add a catalog-only game picker for the admin editor
- `cc2b5b2b` — feat(games): move the admin game editor to the v0.5 components
- `3c3533ba` — feat(games): group the game admin actions in a menu with dialog confirmations
- `56c8cd77` — feat(admin): add search, row action menu and v0.5 components to the users panel
- `e7cd645d` — feat(admin): add loading skeleton, empty state and status badges to invitations
- `dcafa93f` — feat(admin): move premium access to the option picker and badges
- `9e525a27` — refactor(admin): use badge, table and eyebrow primitives in the audit log
- `31abfa43` — refactor(admin): use badge, table and eyebrow primitives in jobs
- `fb08a49a` — feat(admin): pick the promotion feature with an option picker and open row actions from a menu on mobile
- `3f81a7f4` — feat(admin): search franchises and open row actions from a menu on mobile
- `855365f0` — feat(admin): open game row actions from a menu on mobile and group the missing data filters
- `5bbb2416` — refactor(admin): use the hero eyebrow input in reports
- `924d09bc` — refactor(admin): show external data results with badges and a filter section
- `2f9885b9` — refactor(admin): use badges and field labels in the franchise modal
- `cb3e58fa` — refactor(ui): remove the unused select primitive
- `b8ad7f9c` — docs(web): drop the select primitive from the touch target list
- `0e98da9e` — fix(ui): toggle the switch with the space key
- `3cd743cd` — feat(admin): move invite by email to the users hero and show invitations only when there are some
- `e4425231` — fix(admin): give short links in admin lists a 44px touch area
- `443ab92c` — fix(ui): give the switch a 44px touch area
