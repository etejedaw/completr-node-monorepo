# Rediseño de vistas guardadas y tags

**Released:** 2026-10-12

## Summary

Las vistas guardadas del backlog y la página de tags se rediseñan con `LibraryHero`, tarjetas o filas propias y una hoja de acciones para móvil. Es solo frontend. Las vistas guardadas pasan a una tarjeta (`saved-view-card`) con variante de fila y se dividen en secciones "Featured" y "All". Los pósters del hero salen de la biblioteca del usuario mediante un helper compartido.

## Highlights

- Vistas guardadas con tarjetas, variante de fila y hoja de acciones en móvil.
- Secciones separadas para vistas destacadas y todas las vistas.
- Hero de vistas guardadas con pósters de la biblioteca.
- Página de tags con hero, búsqueda y hoja de acciones.

## Added

- `backlog/saved-view-card`: tarjeta con variante de fila y acción "more" en móvil.
- `backlog/library-posters.ts`: helper compartido que obtiene los pósters de la biblioteca.
- `tags/tag-row`: fila de tag con sus acciones.

## Changed

- `saved-filters-view` renderiza con `LibraryHero` y tarjetas, separa destacadas y todas, y abre una hoja de acciones.
- `tags-page` renderiza con `LibraryHero`, búsqueda y hoja de acciones.

## Files of interest

- `apps/web/src/app/features/backlog/saved-view-card/`
- `apps/web/src/app/features/backlog/saved-filters-view/`
- `apps/web/src/app/features/backlog/library-posters.ts`
- `apps/web/src/app/features/tags/tag-row/`
- `apps/web/src/app/features/tags/tags-page/`

## Commits

- `a33b3f3b` — feat(backlog): add saved view card component
- `160c57da` — refactor(backlog): render saved views with library hero and cards
- `cffe4c49` — feat(backlog): add row variant and mobile more action to saved view card
- `164ef742` — feat(backlog): split saved views into featured and all sections with action sheet
- `b6a4a7ad` — feat(backlog): show library posters in saved views hero
- `84ce6eed` — refactor(backlog): extract library posters into shared helper
- `627a9e06` — feat(tags): add tag row component
- `343e2f34` — feat(tags): render tags with library hero, search and action sheet
