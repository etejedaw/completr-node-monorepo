# Menú de biblioteca en la ficha del juego, barra de Feed y regalo de JSON en listas

**Released:** 2026-11-01

## Summary

Cierra la regla de hero y barra de `2026-11-01-hero-and-toolbar-actions` en los lugares que quedaban fuera. La ficha del juego mostraba seis acciones en el hero (My Games, Favorite, Up Next, Want it, Shelf y Lists) y ahora deja My Games y Favorite a la vista y agrupa el resto en un `ActionMenu` que conserva el estado de cada colección. El filtro "Show" de Feed estaba en una fila propia dentro del contenido y pasa a `LibraryToolbar`. Al llevar la exportación de una lista propia al menú `⋯`, la card del regalo `export.json` había desaparecido de esa vista; vuelve junto al menú.

## Highlights

- Ficha del juego: "Add to My Games" (o la última run), Favorite y un `⋯` con Up Next, Want to Get, My Shelf y Lists, que dice dónde ya está el juego.
- Feed: el filtro "Show" queda en la barra fija bajo el hero.
- Detalle de una lista propia: la card "Activate gift" de JSON aparece junto al `⋯` y al canjearla desbloquea JSON en ese menú.

## Added

- `ActionMenuItem.iconClass` para colorear el ícono de un ítem (el color de la sección cuando el juego ya está en ella).
- `ActionMenu.size` (`md` o `lg`) para igualar el alto de los botones vecinos; con `lg` e `iconOnly` el disparador mide `h-11 w-11` y `tap:min-w-[44px]`, porque `w-11` son 38,5px con la raíz de 14px.
- Tests del regalo de JSON en el detalle de lista (`list-overview.interaction.spec.ts`): canje con doble clic que desbloquea JSON en el menú y dueño premium sin card.

## Changed

- `GameLibraryActions` reemplaza la grilla "More library actions" por un `ActionMenu` (`size="lg"`, `iconOnly`, encabezado "Your library") en la misma fila que la acción primaria y Favorite. Los ítems cambian de texto con el estado: "Add to Up Next" o "In Up Next" (deshabilitado, porque ya no hacía nada), "Add to Want to Get" o "Remove from Want to Get", "Add to My Shelf" u "On My Shelf" (abre el diálogo para otra copia) y "Add to a list" o "In N lists". Cada estado activo lleva una descripción accesible ("Already in your queue", "Add another copy"…). La variante `compact` no cambia.
- Se elimina `game-library-actions.model.ts` (`SecondaryAction`).
- `list-detail` usa el mismo `injectExportDownload` del menú para montar `<app-gift-offer-card feature="export.json" variant="compact">` cuando el usuario no tiene premium completo.
- `feed-page`: el bloque `*appPremiumOnly="'activity.feed-filters'"` con el picker "Show" pasa a `<app-library-toolbar>`, con el contenido alineado al ancho del feed (`max-w-3xl`). A quien no tiene la feature no se le muestra una barra vacía.
- Help: la nota de exportación indica que las colecciones se descargan desde el menú Export al final de la barra y las listas propias desde su menú `⋯`.
- `game-detail.interaction.spec.ts`, `game-add-to-list-modal.characterization.spec.ts` y `game-library-actions.spec.ts` usan el menú en lugar de los botones.
- `docs/context/frontend.md` documenta la ficha del juego, la barra de Feed y el regalo en listas.

## Files of interest

- `apps/web/src/app/features/games/game-detail/components/game-library-actions.ts`
- `apps/web/src/app/features/feed/feed-page.html`
- `apps/web/src/app/features/lists/list-detail/list-detail.html`

## Commits

- `b13c6147` — feat(web): add icon color and large size to the action menu
- `46cdefd3` — feat(games): group the game library actions under a more menu
- `9fa88679` — feat(lists): offer the json export gift next to the list actions
- `79b0451b` — feat(feed): move the activity filter into the shared toolbar
- `7f52f1eb` — docs(web): document the game library menu, feed toolbar and list export gift
- `2fdc75c0` — fix(web): keep the large icon action menu trigger at 44px on touch
- `2211a0ae` — fix(help): point list downloads to the list actions menu
