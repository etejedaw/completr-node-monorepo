# Nueva imagen de story del Rewind

**Released:** 2026-11-04

## Summary

La story de 1080×1920 que genera `rewind-share/` se rediseñó. La versión anterior apilaba el año en degradado, la placa de la persona, el abanico de portadas y cuatro tarjetas de cifras de colores distintos que competían entre sí. La nueva conserva el abanico y ordena el resto alrededor de una sola cifra protagonista: franja de marca arriba, mosaico de portadas en duotono violeta detrás del abanico, el total de juegos en grande con el año y el usuario, la persona en una etiqueta plana y hasta tres cifras en línea. La story deja de usar el arte de fondo del juego mejor puntuado, así que tampoco lo descarga; la imagen og (1200×630) no cambia.

## Highlights

- Un total grande (terminados, o empezados si no hay terminados) reemplaza a las tarjetas de colores.
- Mosaico de hasta 12 portadas en duotono violeta detrás del abanico de las 5 primeras.
- Cifras en línea con etiquetas cortas en español e inglés ("313 horas · 72% acabados · 1 platino").
- Sin portadas, el abanico y el mosaico desaparecen y queda un brillo violeta.

## Added

- `templates/cover-mosaic.template.ts`: `duotoneCoverMosaic` dibuja una grilla inclinada de portadas en escala de grises teñida con `mixBlendMode: multiply`; ignora las portadas que no se pudieron descargar y no dibuja nada si no queda ninguna.
- `CoverMosaicLayout` en `rewind-share-template.interface.ts`.
- `personaChip` en `persona-badge.template.ts`: la persona en una etiqueta plana del color de marca.
- `ShareCopy.compactTiles` y `ShareCopy.yearCaption` (`utils/share-copy.util.ts`), en ambos idiomas; `ShareTileLabels` agrupa el tipo de las etiquetas.

## Changed

- `templates/story.template.ts`: nueva composición con franja, mosaico, abanico, total grande, persona y cifras en línea. El tamaño del total se ajusta al largo de la cifra para que entren tres o más dígitos, y el usuario se recorta a 22 caracteres.
- `STORY_COVER_LIMIT` pasa de 5 a 12; el abanico sigue usando las 5 primeras de `selectShareCovers`.
- `rewind-share.service.ts`: solo el formato og pide el arte de fondo (`USES_BACKDROP`).
- `supportingTiles` acepta el juego de etiquetas como cuarto argumento (por defecto `copy.tiles`).
- `wordmark` acepta el color del rombo.

## Removed

- La story ya no usa el año en degradado, la placa inclinada de la persona, las tarjetas de cifras ni el fondo con arte del juego. Esas piezas siguen existiendo porque las usa la imagen og.

## Files of interest

- `apps/api/src/rewind-share/templates/story.template.ts`
- `apps/api/src/rewind-share/templates/cover-mosaic.template.ts`
- `apps/api/src/rewind-share/utils/share-copy.util.ts`
- `apps/api/src/rewind-share/rewind-share.service.ts`
- `docs/architecture.md`

## Commits

- `b764727e` — feat(rewind): redesign the story image with a cover mosaic and a big count
- `9443ed48` — test(rewind): cover the redesigned story image and compact stat labels
- `58a2e733` — docs(api): document the rewind story layout
