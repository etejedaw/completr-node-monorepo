# Pulido del diseño 2026 del Rewind: cifras del hero, años con pocos datos y compartir del visitante

**Released:** 2026-11-17

## Summary

Ajustes del diseño `2026` para que la página se vea pareja en cualquier año y para cada quien la mira. Las cifras del hero dejan de usar un tono por dato y en teléfono ya no dejan una cifra sola en la última fila. Los años con pocos datos (uno o dos juegos, pocos récords, meses sin arte) dejan de verse vacíos. El visitante ya no ve el banner de historias del dueño, que le pedía imágenes que no puede compartir: ve una fila compacta con el enlace del Rewind.

## Changed

- `rewind-2026-results-strip`: cifras en blanco, sin color por dato; en teléfono "Terminados" es la celda líder y el resto va en una grilla sin cifras huérfanas; etiquetas de 14 px.
- `rewind-2026-cover-fan`: con uno o dos pósters, el primero queda iluminado y el piso del abanico se ajusta a su ancho.
- `rewind-2026-highlights`: las columnas de los récords se adaptan a cuántos hay y las etiquetas suben a `text-xs`.
- `rewind-2026-closed-games`: los meses sin arte usan el fondo `surface` y los títulos del póster de respaldo son más grandes.
- `rewind-2026-share-banner`: el dueño sigue viendo el banner de historias (`rewind-2026-story-share-banner`); el visitante ve `rewind-2026-visitor-share-row`, una fila "Comparte el Rewind 2026 de @usuario" con el botón "Share link" (`injectRewindLinkShare`).
- `rewind-copy`: textos de la fila del visitante.

## Files of interest

- `apps/web/src/app/features/rewind/components/rewind-design-2026/rewind-2026-results-strip/`
- `apps/web/src/app/features/rewind/components/rewind-design-2026/rewind-2026-visitor-share-row/`

## Commits

- `b9f15b57` — feat(rewind): show the 2026 hero results in white with an orphan-free phone grid and larger labels
- `e3978875` — feat(rewind): light the lead poster of a short 2026 cover fan and fit its floor to the fan
- `7c553dc8` — feat(rewind): adapt the 2026 highlights columns to sparse years and enlarge their labels
- `f23ebcab` — fix(rewind): give 2026 closed-games months without art a surface and enlarge fallback titles
- `774dfdd3` — test(rewind): cover the 2026 game of the year without any art
- `9a66b517` — feat(rewind): show visitors a compact share-link row instead of the 2026 story banner
