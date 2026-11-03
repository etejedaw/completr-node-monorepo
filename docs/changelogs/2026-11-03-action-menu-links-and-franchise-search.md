# Enlaces en ActionMenu y búsqueda de sagas en Admin

**Released:** 2026-11-03

## Summary

Los ítems de `ActionMenu` que solo navegaban lo hacían con `router.navigate`, así que no se podían abrir en otra pestaña. Ahora un ítem con `link` es un `<a routerLink>` real. Admin → Franchises filtraba en el navegador las primeras 100 sagas; ahora busca y pagina en la API, que ya lo soportaba.

## Added

- `ActionMenuItem.link` (`routerLink` con `queryParams` y `fragment`): `<a ngpMenuItem>` en el menú y `<a>` en la hoja de mobile; cierra al navegar y no emite `selected`. Un ítem con link deshabilitado no tiene `href`.

## Changed

- Admin → Users: "View profile" del ⋮ es un enlace.
- Admin → Games: "View report", en el ⋮ de mobile y en la bandera de escritorio, es un enlace.
- Admin → Franchises: búsqueda en la API con debounce de 300 ms, cancelación de la petición anterior, páginas de 50 con `UiPagination` y vuelta a la página 1 al buscar. Crear, editar o borrar recarga conservando la búsqueda y la página.

## Fixed

- Admin → Users: buscar, limpiar desde "Clear search" y volver a escribir el mismo texto en menos de 300 ms dejaba la lista sin filtrar, porque `distinctUntilChanged` descartaba el valor repetido; `applySearch` ya ignora los repetidos por su cuenta.

## Files of interest

- `apps/web/src/app/shared/components/action-menu/action-menu.html`
- `apps/web/src/app/features/admin/admin-franchises/admin-franchises.ts`
- `apps/web/src/app/features/admin/admin-users/admin-users.ts`

## Commits

- `61928d9b` — feat(web): let action menu items navigate as real links
- `28fe220e` — refactor(admin): link view profile in the users row menu
- `95da41e4` — refactor(admin): link view report in the games row menu
- `60a852dc` — feat(admin): search and paginate franchises through the api
- `9bb79893` — docs(web): document action menu link items
- `f0cdeb05` — fix(admin): search again for the same text typed right after clearing users
- `4e1c6155` — refactor(admin): link the games report flag instead of navigating from a button
