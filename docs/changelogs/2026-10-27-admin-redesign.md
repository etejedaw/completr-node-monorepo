# Rediseño de Admin

**Released:** 2026-10-27

## Summary

Las vistas de Admin pasan al lenguaje del rediseño v0.5 que ya usaban las vistas de la biblioteca: `LibraryHero` sin pósters como encabezado, `LibraryToolbar` para búsqueda y filtros, `OptionPicker` en lugar de `UiSelect` y objetivos táctiles de 44px. Todos los diálogos propios del admin (crear y editar usuario, invitar, sagas, Split y Compilation del editor de juegos) pasan a `UiDialog`, que ya era el único diálogo del resto de la app. Además, admin/games deja de ser solo de lectura: crea, edita y desactiva juegos abriendo el editor de juegos dentro de un `UiDialog`, para lo que el editor suma un modo embebido sin el marco de tarjeta.

## Highlights

- Encabezado, estados de carga, error y vacío, y layout mobile comunes en admin/users, invitaciones, admin/games, admin/franchises, admin/reports, admin/audit, admin/jobs y el editor de juegos.
- Todos los diálogos del admin usan `UiDialog`: hoja inferior en mobile, foco atrapado, Escape y cierre bloqueado mientras se guarda.
- admin/games suma "New game", editar y desactivar por fila, y agrupa los filtros de datos faltantes por fuente con su nombre real.

## Added

- admin/games:
    - Botón "New game" en el hero, que abre el editor en un `UiDialog` "New game".
    - Botón de editar por fila: pide `GET /games/:code` con `getByCode` (el juego del listado no trae todos los campos del editor) y abre el `UiDialog` "Edit game" con el título como subtítulo. Al guardar o dividir se cierra y recarga la lista.
    - Botón de desactivar en los juegos activos, con un `UiDialog` de confirmación. Los 409 los muestra el interceptor y el resto de los errores pasa por `adminErrorMessage`.
- Input `embedded` en `AdminGameEditor`: sin encabezado ni marco de tarjeta y con la barra de guardado fija en `bottom-0`, para usarlo dentro de un diálogo. La ficha del juego y games-browse siguen usando el modo tarjeta.
- Diálogo de confirmación de borrado en admin/franchises, en lugar del `confirm()` nativo.
- Estados de error con "Try again" en las vistas que antes mostraban el estado vacío cuando fallaba la carga.
- `admin-users.spec.ts`.

## Changed

- Las ocho vistas usan `LibraryHero` (eyebrow "Admin"), `LibraryToolbar`, esqueletos y `UiEmptyState` / `UiNoMatches`.
- En mobile, las tablas pasan a filas apiladas o tarjetas y las acciones quedan siempre visibles.
- Filtros de admin/games: el estado es un `SegmentedControl` (Active, Deactivated, All) y los datos faltantes son tres `ChipGroup`: "General", "No score from" (el `name` de cada fuente de `ScoreSourcesService`) y "No time from" (HowLongToBeat y RAWG).
- Filtros de admin/audit con `OptionPicker`, que en mobile abre una hoja inferior.
- admin/jobs: los estados llevan ícono además de color, y los botones de ejecutar son `uiButton` sin el degradado inline.
- Editor de juegos: campos de `shared/ui`, plataformas y géneros como chips con `aria-pressed`, Split y Mark as compilation en una sección "Structure" con su descripción visible, y barra de guardado fija sobre la tab bar en mobile.
- `docs/context/frontend.md`: `UiDialog` ya no tiene excepción en Admin, porque ninguna vista usa `ngpDialog`.

## Fixed

- Los títulos de admin/games tienen un objetivo táctil de 44px en mobile.
- Se eliminan los hex, los colores sueltos de Tailwind y los degradados inline de las vistas de admin.

## Files of interest

- `apps/web/src/app/features/admin/admin-games/admin-games.ts` y `.html`
- `apps/web/src/app/features/games/admin-game-editor/admin-game-editor.html`
- `apps/web/src/app/features/admin/admin-users/admin-users.html`
- `apps/web/src/app/features/admin/admin-franchise-modal/admin-franchise-modal.html`

## Commits

- `15b19b49` — feat(web): redesign the admin invitations panel and invite dialog
- `2f7af0a7` — feat(web): redesign the admin users view with hero, responsive list and dialogs
- `983789cd` — feat(web): redesign admin games with hero, toolbar and stacked rows
- `6d049127` — feat(web): redesign admin franchises with hero and delete confirm dialog
- `58a18675` — feat(web): move the admin franchise modal to ui-dialog
- `224b561f` — feat(web): redesign the admin game editor with the v0.5 visual language
- `f07a7acc` — test(web): read the editor alert message without its icon
- `ef45c558` — feat(web): redesign the admin reports view with the v0.5 look
- `a1d3cdf6` — feat(web): redesign the admin audit log with option pickers and stacked rows on mobile
- `774303db` — feat(web): redesign the admin jobs view with status icons and mobile cards
- `9e90336b` — docs(web): drop the admin exception from the dialog rule
- `990cd67e` — feat(web): add create, edit and deactivate actions to admin games
- `3ca7c533` — fix(web): give admin games title links a 44px touch target
- `1d110468` — feat(web): add an embedded mode to the admin game editor
- `5006307e` — feat(web): open the admin games editor in a dialog
