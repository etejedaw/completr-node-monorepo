# Export dorado con listón Premium

**Released:** 2026-11-05

## Summary

En el menú de Export, el listón Premium de "Download JSON" era un ícono decorativo dentro del ítem: tocarlo descargaba el JSON y no mostraba el toast del beneficio. No se puede volver presionable sin anidar un control dentro de otro. Cuando el usuario tiene el JSON desbloqueado, el botón "Export" pasa a dorado y lleva al lado un `UiPremiumBadge` interactivo, como el selector de filtros del Feed. En el menú, JSON queda en dorado sin listón. Sin acceso, todo sigue igual: Export neutro y JSON con candado.

## Added

- `ActionMenu`: input `premium`, que pinta el disparador en dorado (`!text-premium`).
- `ActionMenuItem.hidePremiumBadge`: oculta el listón `workspace_premium` de un ítem `premium` desbloqueado sin quitarle el dorado.

## Changed

- `ExportActions` (`shared/components/export-actions`) pasa `[premium]="exporter.canExportJson()"` al menú y, con acceso, muestra `<ui-premium-badge interactive label="Premium perk: JSON export">`, que abre `toast.premium`. Sus ítems llevan `hidePremiumBadge`.
- `injectExportDownload` expone `canExportJson`, que considera el premium completo y el regalo de `export.json`. Al canjear el regalo aparecen el dorado y el listón, y desaparecen al vencer.
- El menú `⋯` del detalle de una lista propia conserva el listón en el ítem JSON, porque su disparador agrupa otras acciones.
- `docs/context/frontend.md` describe el disparador dorado, el listón y `hidePremiumBadge`.

## Files of interest

- `apps/web/src/app/shared/components/export-actions/export-actions.ts`
- `apps/web/src/app/shared/components/action-menu/action-menu.html`

## Commits

- `89a78075` — feat(web): add premium trigger and hideable item ribbon to action menu
- `d785cc42` — feat(web): mark export gold with a pressable premium ribbon beside it
- `31553e5f` — docs(web): document the premium export trigger and ribbon
