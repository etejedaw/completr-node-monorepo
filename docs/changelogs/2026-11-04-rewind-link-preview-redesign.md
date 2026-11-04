# Vista previa del Rewind con el estilo de la story

**Released:** 2026-11-04

## Summary

La imagen og (1200×630) que aparece al pegar el enlace de un Rewind en una red social pasa al mismo lenguaje que la story rediseñada: franja de marca arriba, el total grande con el año y el usuario, la persona y las cifras en línea a la izquierda, y a la derecha el mosaico de portadas en duotono con un abanico de 3. Los bloques comunes salen de la story a `templates/rewind-blocks.template.ts`, así que ambos formatos se dibujan con las mismas piezas y solo cambian las medidas. Como ninguno de los dos usa ya el arte de fondo del juego, se elimina su descarga junto con las piezas del diseño anterior que quedaron sin uso. La captura de la story en la landing se actualiza a la imagen nueva.

## Highlights

- La vista previa del enlace y la story comparten diseño y piezas.
- Las dos imágenes descargan hasta 12 portadas y ninguna descarga el arte de fondo.
- Un solo juego de etiquetas de cifras, el corto, para los dos formatos.
- La landing muestra la story nueva en la sección del Rewind.

## Added

- `templates/rewind-blocks.template.ts`: `brandBand`, `totalCount`, `personaLine` e `inlineStats`, con sus medidas como parámetro (`BrandBandLayout`, `TotalCountSizes`, `PersonaLineSizes` e `InlineStatSizes` en `rewind-share-template.interface.ts`).
- `SHARE_COLORS.brandPale` y `SHARE_COLORS.brandDeep`.

## Changed

- `templates/og.template.ts`: nueva composición en dos columnas sobre fondo liso; `OG_COVER_LIMIT` pasa de 3 a 12 y el abanico usa las 3 primeras.
- `templates/story.template.ts`: se arma con los bloques compartidos, sin cambios visibles.
- `ShareCopy.tiles` pasa a las etiquetas cortas ("horas", "acabados", "hours", "finished") y `supportingTiles` vuelve a recibir tres argumentos; desaparece `compactTiles`.
- `rewind-share.service.ts`: `loadArtwork` solo descarga portadas; `ShareArtwork` deja de tener `backdrop`.
- `apps/landing/src/assets/screenshots/rewind-story-mobile.webp` y el texto alternativo de `ReleaseHighlights.astro` muestran la story nueva.

## Removed

- `utils/select-backdrop-url.util.ts` y su test, `BACKDROP_FETCH_WIDTH` y el fondo con arte (`backdropStyle`).
- `templates/persona-badge.template.ts` (placa inclinada), `gradientYear`, `ownerLabel` y `ShareCopy.ownerLabel`.
- `tileBox`, `TileBoxStyle`, el color de `StatTile` y los colores de tarjeta de `SHARE_COLORS`.

## Files of interest

- `apps/api/src/rewind-share/templates/rewind-blocks.template.ts`
- `apps/api/src/rewind-share/templates/og.template.ts`
- `apps/api/src/rewind-share/templates/story.template.ts`
- `apps/api/src/rewind-share/rewind-share.service.ts`
- `apps/landing/src/components/ReleaseHighlights.astro`

## Commits

- `c096050a` — feat(rewind): redesign the link preview image to match the story
- `af4e58f8` — test(rewind): cover the shared mosaic and short labels in both image formats
- `fa30f29b` — docs(api): document the shared composition of the rewind images
- `676b6216` — style(landing): show the new rewind story image
