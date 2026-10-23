# Filtro de varias plataformas en My games

**Released:** 2026-10-23

## Summary

El panel de filtros de "My games" solo permitía elegir una plataforma (`platform_id`). Ahora se pueden combinar las que el usuario quiera (por ejemplo, PS2 y PS3), y la combinación se guarda en las vistas guardadas, que hacen de grupos propios sin necesidad de grupos predefinidos. La API ya aceptaba `platforms` (códigos separados por coma), así que el cambio es solo del web.

## Highlights

- Selector de plataformas de selección múltiple, con búsqueda, "Clear" y una hoja inferior en mobile.
- Las vistas guardadas con `platform_id` se convierten solas en la selección equivalente.

## Added

- `shared/components/option-picker/multi-option-picker.{ts,html}`: componente `app-multi-option-picker`, con trigger tipo campo y un resumen ("All platforms", el nombre, abreviaturas o "N platforms"). En escritorio abre un popover y en mobile una hoja inferior con "Done". Usa un `ngpListbox` en modo `multiple`, muestra búsqueda en listas largas y ordena la selección según las opciones.
- `PickerOption.shortLabel` opcional, para las abreviaturas.

## Changed

- `backlog-filters-panel` reemplaza el `option-picker` de una plataforma por `app-multi-option-picker`, con códigos como valor. Deja de pasar las plataformas al grupo de chips de `game-filter-panel`, para no tener dos controles sobre la misma selección.
- `backlog-list` elimina `selectedPlatform` y deja de enviar `platform_id` en el listado, la previsualización del total, "Surprise me" y las vistas guardadas. Al aplicar una vista, `platformCodesOf` combina `platforms` con el código de su `platform_id`. Las plataformas y las vistas se cargan con `forkJoin` para poder hacer esa conversión.
- La plataforma cuenta una sola vez en los filtros activos y ya no marca "Advanced filters".

## Files of interest

- `apps/web/src/app/shared/components/option-picker/multi-option-picker.ts`
- `apps/web/src/app/features/backlog/components/backlog-filters-panel/backlog-filters-panel.ts`
- `apps/web/src/app/features/backlog/backlog-list/backlog-list.ts`

## Commits

- `fde347d8` — feat(web): add multi option picker with search and bottom sheet
- `4501bbbc` — feat(backlog): filter by several platforms and convert legacy platform_id views
