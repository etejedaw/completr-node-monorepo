# Acciones del hero y de la barra en el resto de las vistas

**Released:** 2026-11-01

## Summary

Continúa `2026-11-01-hero-and-toolbar-actions`: la regla de qué va en el hero y qué en la barra se aplica a las vistas que todavía no la cumplían. Favorites, Browse y las vistas de admin Jobs, Promotions y Reports tenían en la barra acciones que cambian datos o en el hero controles que solo recargan la vista. El resto de las vistas con `LibraryHero` ya seguía la regla y no cambia. La ficha de un juego tiene su propio hero (`GameHero`) con las acciones de la biblioteca y queda fuera de esta regla.

## Added

- `ActionMenu` acepta `variant` (`secondary` por defecto o `primary`) para que un grupo de acciones del mismo tipo ocupe el lugar de la acción primaria del hero.

## Changed

- Favorites (`favorites-view`): "Reorder" pasa de la barra al hero, junto a "Browse games", y solo aparece con más de un favorito. En modo reordenar, el hero muestra "Done" y la barra solo el texto de ayuda.
- Browse (`games-browse`): la barra queda en el orden búsqueda → Genre → Filters → Sort. El "Add game" de admin sale de la barra: va junto al título "Browse" o, en la portada con carrusel, debajo del carrusel.
- Admin → Jobs (`admin-jobs`): los cuatro botones primarios de la barra se reemplazan por un `ActionMenu` primario "Run job" en el hero. Mientras arranca un job, el botón lleva `aria-busy` y los demás jobs quedan deshabilitados. La barra se elimina.
- Admin → Promotions (`admin-promotions`): "New promotion" pasa de la barra al hero como acción primaria y la barra se elimina.
- Admin → Jobs, Promotions y Reports: "Refresh" pasa a ser un botón de ícono de 44px en el hero, con `aria-label` "Refresh". Refresh va al final de la barra cuando la vista tiene una; si no, va en el hero, para no crear una barra con un solo botón.
- `admin-jobs.interaction.spec.ts` arranca los jobs desde el menú y mantiene los casos de triple clic, jobs bloqueados, errores 409, 422, 500 y de red, teclado y orden de Tab.
- `docs/context/frontend.md` documenta dónde va Refresh, el menú primario y el "Add game" de Browse.

## Files of interest

- `apps/web/src/app/features/admin/admin-jobs/admin-jobs.html`
- `apps/web/src/app/features/favorites/favorites-view/favorites-view.html`
- `apps/web/src/app/features/games/games-browse/games-browse.html`

## Commits

- `e4ae7c0f` — feat(web): add a primary variant to the action menu
- `e1c56508` — feat(favorites): move reorder and done into the hero
- `3061b049` — feat(games): order the browse toolbar and move the admin add game out of it
- `6cdad216` — feat(admin): start jobs from a single run job menu in the hero
- `06976572` — feat(admin): move new promotion and refresh into the admin heroes
- `fc6ea39f` — docs(web): document refresh placement and the primary action menu
