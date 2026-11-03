# Tamaños de la búsqueda y encabezados de paneles

**Released:** 2026-11-03

## Summary

Casi todas las vistas forzaban la altura de `UiSearchBar` con `[&_input]:!py-2 [&_input]:!text-sm`, y las barras de herramientas mezclaban dos alturas (31,5px y 35px). `UiSearchBar` suma `size` y las barras quedan unificadas en 35px en escritorio y 44px en táctil. `UiDrawer` y las hojas de panel de `UiBottomSheet` toman el encabezado de `UiDialog`, mientras las hojas que son menús siguen livianas.

## Added

- `UiSearchBar`: `size` `sm` (barras de herramientas), `md` (por defecto, formularios y diálogos) y `lg` (búsqueda protagonista: paso de búsqueda de los diálogos de agregar juego y "Add a game to this list").
- `UiDrawer`: encabezado con halo, separador, `icon` y `tone`.
- `UiBottomSheet`: `variant` `panel` (encabezado de `UiDialog`) o `menu` (liviano, sin halo); sin `variant`, una hoja con `eyebrow` es `panel`.
- `shared/ui/tone/ui-tone.ts`: `UiTone`, `UI_TONE_COLOR`, `UI_TONE_ICON_CLASS` y `UI_TONE_HALO_CLASS`, compartidos por diálogo, cajón y hoja, con la variable `--ui-tone`.

## Changed

- Las 20 vistas con `<ui-search-bar>` dejan de sobrescribir su altura y pasan `size`.
- `ActionMenu` en una barra y los botones Filters, Stats y Clear y el picker "View" de My Games pasan a `h-10`.
- La cola pública vacía (`/user/:u/queue`) usa `ui-empty-state` con "Back to profile".

## Files of interest

- `apps/web/src/app/shared/ui/search-bar/ui-search-bar.ts`
- `apps/web/src/app/shared/ui/bottom-sheet/ui-bottom-sheet.ts`
- `apps/web/src/app/shared/ui/drawer/ui-drawer.ts`
- `apps/web/src/app/shared/ui/tone/ui-tone.ts`

## Commits

- `7eedf0e6` — feat(web): add sm, md and lg sizes to the search bar
- `5a675e52` — refactor(web): drop search bar height overrides and pass size from each view
- `b39f9722` — refactor(ui): extract dialog tone maps into a shared tone module
- `d59f8de2` — feat(ui): give the drawer the dialog header with tone halo and icon
- `89c6de15` — feat(ui): add panel and menu header variants to the bottom sheet
- `01c4dc03` — fix(public-profile): use the illustrated empty state for an empty public queue
- `5a03804c` — refactor(ui): share the tone halo class and rename its variable to ui-tone
- `ce2e0ed0` — fix(backlog): match the view picker height to the toolbar search bar
- `909bd841` — docs(web): document search bar sizes and the drawer and sheet headers
- `2ecae8ac` — fix(web): size the toolbar action menu to the toolbar search bar height
- `1fcc859a` — fix(backlog): size the my games toolbar buttons to the search bar height
