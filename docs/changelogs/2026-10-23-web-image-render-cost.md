# Costo de imágenes y render en el frontend

**Released:** 2026-10-23

## Summary

El rediseño dejó vistas que bajaban imágenes de RAWG mucho más grandes de lo que se muestran y que pintaban muchas capas costosas a la vez. Las tarjetas del backlog reutilizan el póster de 200 px como fondo y el navegador deja de pintar las que quedan fuera de pantalla con `content-visibility`. Los heroes de Browse y de la ficha de juego piden imágenes redimensionadas a 1280 px, y el carrusel de Browse monta solo las imágenes que va a mostrar. El diseño visual no cambia.

## Highlights

- "My games": la carga inicial de imágenes baja de unos 1,1 MB a unos 175 KB, y recorrer la página completa, de unos 5,6 MB a unos 0,8 MB.
- Hero de Browse: al entrar pasa de 5 imágenes originales (unos 2,4 MB) a 2 imágenes de 1280 px (unos 176 KB).
- Fondo de la ficha de juego a 1280 px en lugar de la imagen original.

## Changed

- `backlog-entry-card`: el fondo con blur usa el mismo póster de 200 px que la tarjeta, que ya está en caché, en lugar de pedir uno de 640 px. El blur pasa de `blur-[2px]` a `blur-[5px]` para que no se note el escalado.
- `backlog-entry-card`: el host lleva `content-visibility: auto` con un alto intrínseco estimado (`contain-intrinsic-size: auto 180px`, `225px` en mobile) y `overflow-clip-margin: 3rem` para no recortar la sombra ni el lift del hover. Mientras el menú de estado está abierto pasa a `visible`, para que el menú no quede recortado.
- Pipe `coverUrl`: acepta 1280 como ancho. RAWG admite 200, 420, 640, 1280 y 1920.
- `browse-hero`: las imágenes van por `coverUrl: 1280` y solo se montan la activa, la siguiente y las ya mostradas (`reachedIndexes` / `mountedIndexes`). Las flechas, el autoplay y los puntos pasan por `select()`, que registra cada índice alcanzado.
- `game-hero`: la imagen principal del fondo usa `coverUrl: 1280`.

## Files of interest

- `apps/web/src/app/shared/components/backlog-entry-card/backlog-entry-card.ts`
- `apps/web/src/app/features/games/games-browse/components/browse-hero.ts`
- `apps/web/src/app/shared/pipes/cover-url.ts`

## Commits

- `0a159eed` — perf(web): reuse poster image for entry card background and skip off-screen card rendering
- `2a2b35bf` — test(web): cover entry card background image and content-visibility
- `64256e0b` — feat(web): allow 1280 px width in cover url pipe
- `b7d91e6c` — perf(web): mount browse hero backgrounds lazily at 1280 px
- `355add18` — perf(web): resize game hero backdrop to 1280 px
