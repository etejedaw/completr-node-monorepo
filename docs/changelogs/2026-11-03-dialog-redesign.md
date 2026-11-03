# Rediseño de diálogos y formularios

**Released:** 2026-11-03

## Summary

Los diálogos se veían más viejos que el resto de la app: dos estilos de campo en el mismo formulario (`OptionPicker` de 44px con la etiqueta dentro y `uiInput` de 32px con la etiqueta arriba), todas las etiquetas en eyebrow y un encabezado débil frente a los héroes de las páginas. `UiDialog` suma un encabezado con ícono en un recuadro tintado, título más grande y un halo y separador del color del tono; las etiquetas pasan a texto normal con "Optional" en los campos opcionales y sin asteriscos; todos los inputs miden 44px y `OptionPicker` tiene una variante con la misma caja. Los 33 diálogos de la app y los formularios de Settings y de auth adoptan el estilo.

## Highlights

- Encabezado con `icon` y `tone` (`danger` en borrados, `premium` en lo premium) y, en mobile, la acción primaria a todo el ancho con Cancel debajo.
- Campos de 44px, etiquetas legibles y "Optional" en lugar de asteriscos.
- Admin → Games mueve los filtros de datos faltantes a un cajón (hoja en mobile) con contador y "Show N results", como My Games.
- Abrir un diálogo dos veces con un doble clic ya no apila dos copias.

## Added

- `UiDialog`: inputs `icon` y `tone` (`UiDialogTone`: `brand`, `danger`, `warning`, `success`, `premium`).
- `UiFieldOptional` (`<ui-field-optional />`) y la directiva `UiEyebrow` (`[uiEyebrow]`) para títulos de sección y etiquetas que no son de un campo.
- `OptionPicker`: `variant="input"` y `triggerId`, para usarlo con una `<label uiFieldLabel [for]>` externa.
- Admin → Games: botón Filters con `UiCountBadge` en la barra, borrador de filtros que se descarta al cerrar y conteo previo con `limit: 1`.

## Changed

- `uiFieldLabel` pasa de eyebrow a texto normal; los usos que eran títulos de sección pasan a `uiEyebrow`.
- `.ui-input` mide 44px en todos los anchos salvo `size="sm"`.
- Create user, Edit user y Premium access muestran cada error de validación una sola vez, bajo su campo, y enfocan el primero inválido; el resumen queda para los errores del servidor sin campo conocido.
- Change status toma el ícono y el tono de cada estado; Up Next vacío usa `ui-empty-state` con el botón primario, como My Shelf.
- Rewind Generate mueve sus acciones al pie del diálogo; el onboarding muestra un ícono por paso; `SettingsRow` acepta `optional`.
- Audit: "Clear filters" a la altura de los pickers.

## Fixed

- `DialogService.open` devuelve el diálogo que ya está abierto del mismo componente en lugar de abrir otro; `queue-view` deja su guarda local.
- `.ui-input` usa `44px` en lugar de `2.75rem`, que con la fuente raíz de 14px daba 38,5px.
- Las búsquedas de los diálogos `flush` tienen aire bajo el separador del encabezado.

## Files of interest

- `apps/web/src/app/shared/ui/dialog/ui-dialog.ts`
- `apps/web/src/app/shared/ui/label/ui-field-label.ts`
- `apps/web/src/app/shared/components/option-picker/option-picker.html`
- `apps/web/src/app/core/services/dialog.ts`
- `apps/web/src/app/features/admin/admin-games/admin-games.html`
- `docs/context/frontend.md`

## Commits

- `846de1e6` — feat(ui): anchor the dialog header with a tinted icon and tone band
- `3da12082` — feat(ui): restyle field labels as plain text and add optional and eyebrow markers
- `cb838b4a` — feat(ui): make inputs 44px tall
- `9ac899ec` — feat(web): add an input variant to the option picker
- `160b607a` — feat(admin): use the anchored header and plain labels in the create user and promotion dialogs
- `bd16aade` — feat(lists): use the anchored header and an optional marker in the list dialog
- `32d116ec` — docs(web): document the dialog header, form labels and option picker input variant
- `546c41a7` — feat(backlog): use the anchored header, plain labels and input pickers in the backlog modal
- `b0fb7ebe` — feat(backlog): anchor the status icon and tone in the status change dialog header
- `c272fa13` — feat(backlog): add header icons and optional markers to the surprise me and saved view dialogs
- `1c95dc38` — feat(game-shelf): use the anchored header, plain labels and an input picker in the shelf modal
- `44ad5d17` — feat(wishlist): add header icons and an optional platform label to the want to get dialogs
- `b3d499d7` — feat(queue): use the illustrated empty state in up next and anchor its dialog headers
- `a1c17f1b` — feat(platinum): use the anchored header and optional input pickers in the platinum dialog
- `f7cdd91f` — feat(games): add header icons to the report, add to list and up next run dialogs
- `62be3112` — feat(lists): add an icon and drop the asterisk in the duplicate list dialog
- `19931fc4` — feat(tags): use the anchored header, optional marker and danger tone in tag dialogs
- `4f2a0106` — feat(rewind): add icons to the generate and share dialogs and move the generate actions to the footer
- `48eb2ab4` — feat(public-profile): use the danger tone and an icon in the unfollow dialog
- `70d02951` — feat(web): use the danger tone and an icon in the unfollow confirm dialog
- `3188f143` — feat(web): add a step icon to the onboarding tour dialog
- `fb0206d5` — feat(auth): use the shared field label in the auth forms
- `8f3ab4d6` — feat(settings): add the optional marker to settings rows and use eyebrow group titles
- `5c44d662` — fix(web): reuse an open dialog instead of stacking a second copy
- `35ee3c84` — refactor(queue): rely on the dialog service to block a second add modal
- `021a1605` — refactor(ui): export the dialog tone type from the ui barrel
- `97344b76` — feat(admin): show user form errors once, under each field
- `f1aa9b4e` — feat(admin): anchor the premium access header and show its errors under each field
- `d9682942` — feat(admin): move the admin games missing data filters into a drawer with a results preview
- `c432cafd` — feat(admin): add header icons and plain labels to the remaining admin dialogs
- `25388a7b` — fix(admin): align clear filters with the audit pickers
- `01c3e59e` — feat(games): use plain labels, optional markers and 44px rows in the game editor
- `eca6adae` — feat(games): give the game admin confirmations a danger icon
- `421dcdd3` — fix(ui): size inputs in pixels so they reach 44px with the 14px root font
- `c140bc15` — fix(web): give the flush dialog search bars room below the header separator
