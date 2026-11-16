# Arte de juego con respaldo entre portada y fondo

**Released:** 2026-11-16

## Summary

Un juego puede traer solo `coverUrl` o solo `backgroundUrl`, según la fuente de la que se importó, y los huecos de la web que usaban una sola imagen quedaban vacíos. La API ahora manda `coverUrl` junto a `backgroundUrl` en cada payload que expone un juego, y la web elige el arte con el helper `gameArtUrl` y el pipe `gameArt` según la orientación del hueco: los verticales usan la portada con el fondo de respaldo y los horizontales el fondo con la portada de respaldo. La regla queda escrita en `docs/rules.md`.

## Highlights

- Todo payload de la API con un juego incluye `coverUrl` y `backgroundUrl`.
- Un solo punto de decisión en la web para elegir el arte de cada hueco.
- La paleta de búsqueda también cae a la otra imagen cuando falta la preferida.

## Added

- API: `coverUrl` en los atributos y serializers de actividad, backlog, favoritos, franquicias, platinos, estante de juegos, listas, usuarios y catálogo de juegos (`BACKLOG_GAME_ATTRS` y equivalentes).
- Web: `gameArtUrl` (`shared/utils/game-art.ts`), el modelo `GameArtSource` y el pipe `gameArt` (`shared/pipes/game-art.ts`).
- Web: `coverUrl` en los modelos de backlog, favoritos, estante, listas, platinos, cola, wishlist, búsqueda global, usuarios, feed, franquicias, perfil público y showcase.

## Changed

- Los huecos de arte de las features de admin, auth, backlog, favoritos, perfil público y demás usan `gameArt` o `gameArtUrl` con la orientación del hueco.
- Los pósters de la paleta de búsqueda (`search-palette-option`) usan el mismo respaldo.
- `docs/api/` documenta `coverUrl` en los payloads de juegos.

## Files of interest

- `apps/web/src/app/shared/utils/game-art.ts`
- `apps/web/src/app/shared/pipes/game-art.ts`
- `apps/api/src/backlog/backlog.constants.ts`
- `apps/web/src/app/layout/search-palette/search-palette-option.ts`

## Commits

- `2a642d38` — feat(api): send the cover next to the background in every game payload
- `8d0863db` — test(api): cover the game cover in serializers, catalog, showcase and feed
- `36f30e1d` — docs(api): document coverUrl in the game payloads
- `b613ad5b` — feat(web): add a game art helper and pipe that pick the art by slot orientation
- `561efc76` — feat(web): add coverUrl to the game models
- `872143fb` — fix(web): fall back between cover and background in every game art slot
- `6dcf4b45` — fix(web): fall back between cover and background in the search palette posters
- `3ab7f19e` — test(api): expect the cover next to the background in platinum and dlc payloads
