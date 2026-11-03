# Selector de fechas y errores de campo

**Released:** 2026-11-03

## Summary

Las fechas usaban `<input type="date">` y `type="datetime-local"` nativos, que muestran el formato y el calendario del navegador según el idioma del sistema. `UiDatePicker` los reemplaza en los 9 formularios que los tenían. El mensaje de error bajo un campo, copiado a mano en 16 archivos, pasa a `UiFieldError`.

## Highlights

- Calendario en popover en escritorio y en hoja inferior en mobile, con teclado completo y fecha en inglés ("Nov 3, 2026").
- Fecha y hora con botones táctiles de 44px en Promotions y Premium access.
- En los filtros de My Games ya no se puede elegir un From posterior al To.

## Added

- `UiDatePicker` (`shared/ui/date-picker`), sobre `ng-primitives/date-picker`: modo fecha o fecha y hora, `minDate` / `maxDate`, `clearable`, `invalid` y `describedBy`; implementa `FormValueControl<string>` para signal forms y conserva el formato de cada formulario (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm`).
- `UiFieldError` (`shared/ui/form-field`): mensaje con ícono `aria-hidden`, enlazado al campo con `aria-describedby` y sin rol por defecto (`announce` lo vuelve `role="alert"`).

## Changed

- `backlog-modal`, `backlog-filters-panel`, `status-change-dialog`, `admin-premium-access`, `admin-promotions`, `platinum-dialog`, `queue-view`, `game-shelf-modal` y `admin-game-editor` usan `UiDatePicker`.
- Los errores de campo de Settings, auth, Lists, Tags, My Games, el editor de juegos y admin usan `UiFieldError`; en Admin → Users quedan enlazados a su campo, cosa que antes no pasaba.
- `tsconfig.app.json` excluye `src/**/*.testing.ts`, los helpers de specs.

## Files of interest

- `apps/web/src/app/shared/ui/date-picker/ui-date-picker.ts`
- `apps/web/src/app/shared/ui/form-field/ui-field-error.ts`
- `apps/web/src/app/features/backlog/components/backlog-filters-panel/backlog-filters-panel.html`

## Commits

- `270c2cf2` — feat(web): add the field error piece
- `8c00573e` — feat(web): add a date picker with popover, bottom sheet and time steppers
- `62e9e460` — refactor(web): replace native date inputs with the date picker
- `4c60143e` — refactor(web): use the field error piece for inline field errors
- `1ed1fce4` — docs(web): document the date picker and field error pieces
- `f553bb61` — build(web): keep spec testing helpers out of the app build
