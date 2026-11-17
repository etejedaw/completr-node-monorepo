# Pulido del recap del Rewind 2025

**Released:** 2026-11-16

## Summary

Dos ajustes al artículo del recap de IA del diseño `2025`. Los insights ahora van en su propia columna, que arranca a la misma altura que el titular, y cuando no hay insights el texto vuelve a repartirse en dos columnas. La tarjeta del reto del año siguiente usa el color de marca en lugar del dorado, porque ya está dentro del marco dorado premium y competía con él.

## Changed

- `rewind-2025-recap-article`: con insights, el cuerpo es una grilla de dos columnas (`@3xl/page:grid-cols-2`) con la historia, titular incluido, a un lado y los insights al otro. Sin insights, la historia se parte en dos columnas (`columns-2`). Se calcula con `hasInsights`, `bodyLayoutClass` y `storyColumnsClass`.
- La tarjeta del reto usa borde, ícono y eyebrow `brand` en lugar de `premium`, y recibe `data-recap-challenge`.
- Specs del diseño `2025` actualizados para ambos casos.

## Files of interest

- `apps/web/src/app/features/rewind/components/rewind-design-2025/rewind-2025-recap-article/rewind-2025-recap-article.ts`
- `apps/web/src/app/features/rewind/components/rewind-design-2025/rewind-2025-recap-article/rewind-2025-recap-article.html`

## Commits

- `375e49a6` — feat(rewind): start the 2025 recap insights level with the headline
- `c11d7126` — fix(rewind): paint the 2025 recap challenge card in the brand colour instead of gold
