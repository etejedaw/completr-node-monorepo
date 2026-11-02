# Acciones del hero y de la barra de herramientas

**Released:** 2026-11-01

## Summary

Cada página decidía por su cuenta qué botones iban en el hero y cuáles en la barra de herramientas, y las barras se iban llenando de botones (My Games tenía siete controles). Ahora hay una regla: el hero lleva lo que crea o cambia datos (como máximo una acción primaria y una secundaria, el resto en un menú `⋯`), y la barra lleva lo que solo cambia la vista, en un orden fijo: búsqueda → vista guardada → filtros → orden → modo de vista → Export. Para eso se agregó `ActionMenu`, un botón que agrupa acciones en un menú en escritorio y en una hoja inferior en mobile. Export, el detalle de una lista propia y la barra de My Games ya siguen la regla; el resto de las vistas se ajusta en entregas siguientes.

## Highlights

- CSV, JSON y la insignia premium se reemplazan por un solo botón "Export" con "Download CSV" y "Download JSON" en todas las colecciones exportables.
- JSON aparece con candado a quien no tiene acceso, en lugar de ocultarse.
- El detalle de una lista propia queda en "Add game" + `⋯` (Edit list, Refresh scores, Duplicate y las dos descargas).
- El selector de modo de vista muestra solo íconos.

## Added

- `ActionMenu` (`shared/components/action-menu`): `label`, `heading`, `items` de `ActionMenuItem`, `icon`, `iconOnly`, `placement` (`toolbar` o `hero`) y `busy`; emite `selected` con el `id` del ítem. Usa el menú de `ng-primitives` en escritorio y `UiBottomSheet` en mobile. El menú se nombra con `heading`, cada ítem con su `label`, y `hint` es su descripción accesible. `separated` dibuja una línea antes del ítem, `premium` lo pinta de dorado, `locked` le pone candado sin impedir elegirlo, y `disabled` / `busy` sí lo impiden.
- `injectExportDownload` (`shared/components/export-actions/export-download.ts`): descarga, estado por formato, acceso a JSON (incluido el regalo `export.json`) y los ítems de menú de las descargas. Lo comparten `ExportActions` y el menú del detalle de lista.
- Spec de `ActionMenu` con doble clic sobre un ítem ocupado, ítem bloqueado y hoja inferior en mobile.

## Changed

- `ExportActions` pasa a ser un `ActionMenu` "Export". JSON lleva `workspace_premium` si el usuario tiene `export.json`. Si no, aparece con candado y la descripción "Premium perk"; elegirlo pide la descarga y el 402 `EXPORT_FORMAT_PREMIUM` lo avisa `errorInterceptor` con `toast.premium`. Mientras descarga, el botón tiene `aria-busy` y el ítem de ese formato no se puede volver a elegir. La card del regalo `export.json` sigue junto al botón.
- Detalle de lista (`list-detail`): las acciones del dueño se reducen a "Add game" y un `ActionMenu` `⋯` con Edit list, Refresh scores, Duplicate, Download CSV y Download JSON. La hoja "List actions" propia de mobile se elimina, porque el mismo menú abre como hoja inferior.
- My Games (`backlog-list`): la barra queda en el orden búsqueda → View → Filters (con Clear / Exit view y Stats) → modo de vista → Export. El picker de vistas guardadas sale del hero en mobile y queda en la barra en todos los anchos; en el hero de mobile solo queda el picker de estado.
- `ViewModeToggle`: el nombre de cada vista queda en `sr-only` y en `title` en todos los anchos.
- `docs/context/frontend.md` documenta la regla de hero y barra y el componente `ActionMenu`, y actualiza `ExportActions` y `ViewModeToggle`.

## Removed

- La insignia premium junto al botón JSON de las barras de exportación.

## Files of interest

- `apps/web/src/app/shared/components/action-menu/action-menu.ts`
- `apps/web/src/app/shared/components/export-actions/export-download.ts`
- `apps/web/src/app/features/lists/list-detail/list-detail.html`
- `apps/web/src/app/features/backlog/backlog-list/backlog-list.html`

## Commits

- `ab3fdc2e` — feat(web): add shared action menu with bottom sheet on mobile
- `f6f78107` — feat(web): group csv and json export under a single export menu
- `6008b068` — feat(web): show the view mode toggle as icons only
- `1330a366` — feat(lists): move list owner actions into a more actions menu
- `ccd936f5` — feat(backlog): order the my games toolbar and keep saved views in it on mobile
- `7544f6a1` — test(wishlist): export through the export menu
- `3051953d` — docs(web): document the hero and toolbar placement rule and the action menu
