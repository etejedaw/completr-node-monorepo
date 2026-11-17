# Rediseño del Rewind 2026: hero, compartir, destacados y cerrados

**Released:** 2026-11-16

## Summary

El diseño `2026` del Rewind se rehízo de arriba abajo. El hero ahora lleva una franja con las 7 cifras del año y un abanico de hasta 5 pósters de juegos terminados, que sigue la misma regla de selección que la imagen de compartir y se ilumina con un halo, atenuación por profundidad y un reflejo en el suelo; la sección de Resultados y el componente compartido `rewind-tally` desaparecen. Compartir pasa a mostrar las dos imágenes de historia lado a lado, con descarga y compartir por imagen en el diálogo, y suma un banner a todo el ancho y una tarjeta a todo el ancho del juego del año sobre el recap de IA. Los destacados se muestran como números sobre arte atenuado de los juegos con una fila de estadísticas, y los juegos cerrados como una fila por mes sobre el arte atenuado, sin la línea de tiempo vertical. Los componentes que solo usa este diseño se movieron a `rewind-design-2026/`, según la regla de diseños anuales independientes de `docs/architecture.md`, y la lógica de compartir se extrajo a `injectRewindShareActions` para reutilizarla en el diálogo y en el banner. La API no cambia.

## Highlights

- Hero con franja de 7 cifras (conteo animado) y abanico de pósters con halo, atenuación por profundidad y reflejo.
- Diálogo de compartir con las dos imágenes lado a lado y acciones por imagen, más un banner de compartir a todo el ancho en la página.
- Tarjeta "Game of the year" a todo el ancho; Top rated sale de los destacados.
- Destacados como números sobre arte atenuado, y cerrados como una fila por mes.

## Added

- `rewind-2026-results-strip/`: franja de cifras en el hero. Mantiene las reglas de filas de `rewindTallyRows` (Empezados y Platinos solo si son mayores que 0, tasa de cierre y nota solo si no son nulas, el 0 % se muestra) y el conteo escalonado, respeta reduced motion y el caso sin `IntersectionObserver`. Expone una región "Results" con un `dl` y texto propio para lector de pantalla.
- `rewind-2026-cover-fan/`: abanico de hasta 5 pósters decorativos (`aria-hidden`, `alt=""`). Elige juegos con la misma regla que `select-share-covers.util.ts` (mejor puntuado, luego terminados del más reciente al más antiguo, únicos por juego y por imagen, con portada antes que solo fondo) y descarta los que no tienen arte. No pinta nada si no hay pósters. Cada póster recibe `depth` (`Math.abs(offset)`) para atenuar los exteriores, y el abanico suma un halo de marca, el suelo y un reflejo.
- `rewind-2026-share-banner/`: banner a todo el ancho con collage inclinado de pósters (hasta 24 teselas, repetidas si hay pocos juegos), titular, descripción, previsualización de las imágenes de historia y tres acciones. Un solo botón de descarga baja las dos imágenes; sin compartir de archivos, Copy link pasa a ser la acción principal.
- `rewind-2026-game-of-the-year/`: tarjeta a todo el ancho con arte apaisado, póster inclinado, cápsula de estrella, estrellas de solo lectura y el título enlazado al juego. Solo aparece si hay juego mejor puntuado.
- `injectRewindShareActions` (`features/rewind/inject-rewind-share-actions.ts`, con `.model.ts` y spec): la lógica de compartir extraída de `rewind-share-actions`, con `downloadAll()` nuevo.
- Copy `page.gameOfTheYear`, `page.shareHeadline(year)` y `page.shareDescription` en español e inglés, y una variante para visitantes que usa el nombre del dueño en el banner y en el juego del año.
- Specs de cada componente nuevo y de la galería de compartir.

## Changed

- `rewind-share-actions` reemplaza las pestañas por una galería de dos columnas 9:16 con una barra por imagen (nombre de la página, descargar y compartir). El diálogo ofrece "Share both" y "Copy link"; con una sola imagen se centra y se oculta su Share individual, y sin compartir de archivos Copy link pasa a ser la acción principal. Ahora es una capa fina sobre el helper y perdió la opción `previewSize`.
- `rewind-design-2026`: la grilla del hero ya no usa áreas con nombre, y la página se ordena como hero, banner, juego del año, recap, destacados, mezcla, estadísticas, terminados y más años, en una sola columna.
- `rewind-highlights` pasó a `rewind-design-2026/rewind-2026-highlights/` (`Rewind2026Highlights`) y se reescribió: récords como celdas completas enlazadas al juego, con el valor grande sobre el arte apaisado atenuado en escala de grises, y una fila de estadísticas con rango de meses, géneros y plataformas. Si el primer y el último juego son el mismo, solo se muestra el primero. Cada celda sin dato se omite sin dejar huecos.
- `rewind-finished-games` pasó a `rewind-design-2026/rewind-2026-closed-games/` (`Rewind2026ClosedGames`): una fila por mes con juegos cerrados, en orden calendario, con el mes y los conteos a la izquierda y los pósters a la derecha. En teléfono la fila se apila y los pósters hacen scroll horizontal con snap. El arte de fondo es el apaisado del primer terminado con arte, o del primer abandonado con arte si no hay terminados. Los abandonados se muestran en gris y recuperan el color con hover o foco, y los juegos sin arte usan un tile con el título.
- El placeholder diferido de los cerrados usa tres skeletons de fila en lugar de círculos y línea.
- Los visitantes ven el nombre del dueño en el banner y en el juego del año.

## Removed

- La sección Resultados del diseño `2026` y el componente `rewind-tally` (4 archivos); el recuento del diseño `2025` es otro componente.
- La frase resumen del hero `2026`.
- Top rated de los destacados (pasó a la tarjeta del juego del año), junto con la lógica del bento: spans, filas anchas, empaquetado, tonos e `HighlightKey` de `topRated`.
- La línea de tiempo vertical de los cerrados, sus tonos por mes y el texto `timeline.abandoned` del copy (`rewind-copy` en inglés y español).
- `rewind-share-actions.model.ts` (`RewindSharePage` se movió al modelo del helper) y las pestañas de la sección de compartir.

## Files of interest

- `apps/web/src/app/features/rewind/components/rewind-design-2026/rewind-design-2026.html`
- `apps/web/src/app/features/rewind/components/rewind-design-2026/rewind-2026-cover-fan/rewind-2026-cover-fan.ts`
- `apps/web/src/app/features/rewind/components/rewind-design-2026/rewind-2026-results-strip/rewind-2026-results-strip.ts`
- `apps/web/src/app/features/rewind/components/rewind-design-2026/rewind-2026-share-banner/rewind-2026-share-banner.ts`
- `apps/web/src/app/features/rewind/components/rewind-design-2026/rewind-2026-highlights/rewind-2026-highlights.ts`
- `apps/web/src/app/features/rewind/components/rewind-design-2026/rewind-2026-closed-games/rewind-2026-closed-games.ts`
- `apps/web/src/app/features/rewind/inject-rewind-share-actions.ts`

## Commits

- `7662f649` — feat(rewind): show both story images side by side with per-image download and share actions
- `8a9d0765` — test(rewind): cover the share gallery with per-image actions instead of tabs
- `883c360d` — feat(rewind): add the 2026 hero cover fan of finished game posters
- `b3dc7b7d` — feat(rewind): add the 2026 hero results strip with counting numbers
- `9472899e` — feat(rewind): put the results and the cover fan in the 2026 hero and share beside the recap
- `b89a9a2d` — test(rewind): cover the 2026 hero strip, fan and share row placement
- `bc55b31b` — refactor(rewind): extract share actions into a reusable injectRewindShareActions helper
- `4bf9b864` — refactor(rewind): drop top rated from the highlights bento
- `6e350f24` — feat(rewind): add the full-width 2026 share banner with story image previews
- `64e1b017` — feat(rewind): add the full-width 2026 game of the year card
- `d52fe09b` — feat(rewind): stack the 2026 share banner and game of the year full width above the recap
- `f782b011` — fix(rewind): address visitors by the owner's name in the 2026 share banner and game of the year
- `19b4886c` — feat(rewind): redesign the 2026 highlights as numbers over faded game art with a stats row
- `9ec40b5f` — test(rewind): read the top genres from the highlights stats row
- `76ae63cc` — feat(rewind): show the 2026 closed games as month rows over faded game art
- `aa9f0293` — refactor(rewind): drop the timeline abandoned date suffix copy
- `41e1da3a` — feat(rewind): light the 2026 hero cover fan with a halo, depth dimming and a floor reflection
