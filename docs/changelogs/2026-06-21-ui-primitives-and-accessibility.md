# Primitivas de UI y accesibilidad

**Released:** 2026-06-21

## Summary

Cierre del bloque de base de componentes de Fase 2.5. Se completa la capa `shared/ui` con wrappers sobre ng-primitives y se aplica en toda la app, en lugar de inputs, selects y avatares hechos a mano en cada feature. En la misma pasada se hace una revisión de accesibilidad: roles, etiquetas, foco atrapado en modales y navegación por teclado.

## Highlights

- Wrappers nuevos: `uiSeparator`, `uiAvatar`, `uiProgress`, `uiTextarea`, `uiFormField`, `uiRadio`, `uiSelect` y `UiFocusTrap`.
- Toasts, paginación y barra de búsqueda migran a ng-primitives.
- Modales con foco atrapado y cierre con Escape; tablas y menús accesibles por teclado.

## Added

- `shared/ui`: `separator`, `avatar`, `progress`, `textarea`, `form-field`, `radio`, `select` y `focus-trap`; variante de tamaño `sm` en `uiInput`.
- `star-rating` con semántica de slider ARIA y navegación por teclado.
- `aria-sort` y navegación por teclado en las cabeceras ordenables del backlog; `scope="col"` en las tablas de datos.
- Rol `menu` y cierre con Escape en los dropdowns de estado del backlog.
- Íconos decorativos ocultos a lectores de pantalla, botones de ícono con etiqueta, roles de diálogo en modales y `alt` en imágenes.
- Overlay de grano, entrada escalonada de listas y acentos asimétricos en el tema.

## Changed

- `ToastService` y su contenedor usan el toast manager de ng-primitives.
- `ui-pagination` y `ui-search-bar` usan ng-primitives.
- Sidebar, feed, perfil público, discover, settings y modales usan `uiAvatar`, `uiSeparator`, `uiProgress`, `uiTextarea`, `uiFormField`, `uiRadio` y `uiSelect`.
- Inputs numéricos de filtros usan `uiInput` con tamaño `sm`.

## Fixed

- El template del toast enlaza `let` a la clave de contexto que exige el manager de ng-primitives.
- `UiAvatar` redondea el host para que el anillo se vea circular.

## Files of interest

- `apps/web/src/app/shared/ui/index.ts`
- `apps/web/src/app/shared/ui/focus-trap/ui-focus-trap.ts`
- `apps/web/src/app/core/services/toast.ts`
- `apps/web/src/app/shared/components/toast-container/toast-container.ts`

## Commits

- `a91a9d99` — style(theme): add grain overlay, staggered list entry and asymmetric accents
- `88f163b3` — refactor(ui): migrate pagination and search-bar to ng-primitives
- `0bb0b36e` — feat(ui): add separator, avatar and progress wrappers plus uiInput size variant
- `43768add` — refactor(layout): use uiSeparator and uiAvatar in sidebar
- `edbfcf7b` — refactor(feed): use uiAvatar for follow requests and activity items
- `4c29ecb0` — refactor(lists): use uiProgress for list progress bars
- `40edd4aa` — refactor(filters): replace raw number inputs with uiInput size=sm
- `46cff086` — feat(ui): add textarea, form-field and radio wrappers
- `f00472e6` — feat(star-rating): add slider aria semantics and keyboard navigation
- `6cdf5a11` — refactor(lists): use form-field, textarea and radio in list-modal
- `62df778b` — refactor(settings): use form-field and textarea in profile form
- `c275c44a` — refactor(games): swap uiInput to uiTextarea on game-detail textareas
- `f52b7f91` — feat(ui): add uiSelect wrapper with native chevron styles
- `b34aac15` — refactor(admin): use uiSelect for admin form dropdowns
- `c6315f0a` — refactor(backlog): use uiSelect for backlog modal and filter dropdowns
- `4ba50133` — refactor(game-shelf): use uiSelect for shelf modal platform dropdown
- `b1a8daec` — feat(backlog): add aria-sort and keyboard nav to sortable table headers
- `3b24bb74` — refactor(tables): add scope=col to data table headers
- `a9596623` — refactor(toast): migrate ToastService and container to ng-primitives toast manager
- `32fc6d2c` — feat(ui): round UiAvatar host so applied ring renders circular
- `dca7e82d` — refactor(ui): apply UiAvatar across public-profile, users-discover, settings and user-list-modal
- `40e8561e` — refactor(ui): apply uiTextarea to remaining textareas across modals
- `44d42496` — feat(a11y): hide decorative icons, label icon buttons, add modal roles and image alts
- `a30d7ab7` — feat(ui): add UiFocusTrap directive with escape output
- `e0a7e023` — feat(a11y): trap focus and close on escape in main modals
- `742c3285` — feat(a11y): add menu role and keyboard escape to backlog status dropdowns
- `4d914422` — fix(toast): bind template let to context key required by ngp manager
