# Rediseño de My Games

**Released:** 2026-10-13

## Summary

La lista de My Games (`features/backlog/backlog-list`) se rediseña sobre componentes compartidos: un hero de biblioteca (`library-hero`), una tarjeta de entrada (`backlog-entry-card`) y un resumen de ratio (`ratio-summary`). Las tarjetas de diario giran para mostrar nota y reseña, y en móvil los filtros de estado y las vistas guardadas pasan a hojas inferiores con acciones por swipe. Es solo frontend; la API de backlog no cambia.

## Highlights

- Hero de biblioteca y tarjeta de entrada compartidos, reutilizables por otras vistas.
- Tarjetas de diario con giro para ver nota y reseña.
- Hojas móviles para filtro de estado y vistas guardadas, y acciones por swipe en la lista.
- El filtro por mood tag se aplica desde la URL.

## Added

- Componentes compartidos `library-hero`, `backlog-entry-card`, `ratio-summary`, `flip-card` y `entry-annotation`.
- Tamaño grande y entrada `showValue` en `star-rating`.
- Hojas inferiores y acciones por swipe en `backlog-list`, con filtros de estado y vistas guardadas adaptados a móvil.
- Lectura del filtro de mood tag desde la URL en `backlog-list`.
- `ratio-summary` permite reemplazar su etiqueta personal.

## Changed

- `backlog-list` usa `library-hero` y `backlog-entry-card`; su plantilla se reduce de forma notable.
- Las pastillas de filtro de estado y el layout móvil se reorganizan; los metadatos de la tarjeta de diario pasan debajo de la valoración.
- Favoritos y wishlist usan iconos de corazón y regalo en vistas, navegación y etiquetas de actividad.

## Removed

- La columna de notas en las listas de biblioteca (`backlog-list` y `game-shelf-list`) y el componente `entry-annotation`, que quedó sin uso.

## Files of interest

- `apps/web/src/app/features/backlog/backlog-list/backlog-list.ts` — estado de la lista, filtros y hojas móviles.
- `apps/web/src/app/shared/components/backlog-entry-card/backlog-entry-card.ts` — tarjeta de entrada.
- `apps/web/src/app/shared/components/library-hero/library-hero.ts` — hero de biblioteca.
- `apps/web/src/app/shared/components/flip-card/flip-card.ts` — giro de tarjeta.

## Commits

- `90077549` — feat(backlog): show ratio summary and entry annotations in list
- `1ed985ff` — style(web): use heart and gift icons for favorites and wishlist
- `443331bc` — feat(backlog): flip diary cards to show note and review
- `efd1a0da` — style(backlog): move diary card metadata below the rating
- `3c208a73` — feat(ui): add large size to star rating
- `bfe1857d` — feat(backlog): add mobile sheets and swipe actions to list
- `0f97f69a` — style(backlog): rework status filter pills and mobile layout
- `0491a93d` — feat(backlog): add mobile sheets for status filter and saved views
- `c5f339d3` — style(backlog): adjust diary card action spacing for annotated entries
- `eb096f36` — feat(shared): let ratio summary override its personal label
- `6252e21f` — feat(shared): add library hero component
- `ff232579` — feat(shared): add backlog entry card component
- `bba353b2` — refactor(backlog): use shared library hero and entry card
- `5473f3b6` — feat(backlog): apply mood tag filter from url
- `f31dfade` — feat(web): add showValue input to star rating
- `551aa708` — refactor(web): drop notes column from library lists
