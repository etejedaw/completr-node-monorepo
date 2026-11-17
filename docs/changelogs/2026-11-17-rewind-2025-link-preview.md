# Vista previa de enlace del Rewind 2025 y catálogo de imágenes por formato

**Released:** 2026-11-17

## Summary

El diseño `2025` no tenía imagen para la vista previa al compartir su enlace. Ahora dibuja su propia `og.png` con estilo de revista (página partida: arte a un lado, año, persona y cifras al otro), y la página de share del 2025 la publica en `og:image`. Para que cada diseño declare qué formatos tiene, el módulo `rewind-share` pasa de una plantilla por diseño a un catálogo por formato: el 2025 solo trae la `og`, así que sus historias siguen respondiendo 404. Además, el recap del 2025 deja el dorado solo en el marco premium y dibuja sus acentos internos en el color de la marca.

## Added

- `rewind-share/templates/og-2025.template.ts`: imagen `og` del diseño 2025.
- Catálogo por formato (`shareFormatTemplate`, `hasShareImage`) en `share-designs.template.ts`, con los textos del 2025 en `utils/share-copy-2025.util.ts`.

## Changed

- La página de share de un Rewind 2025 emite `og:image` apuntando a su `og.png`.
- `rewind-2025-recap-article`: la capitular, la barra de la cita y la bombilla usan `brand`; el dorado queda solo en el marco.
- Colección Bruno: `get-rewind-og-image`, `get-rewind-share-page`, las dos de historias (404 para el 2025) y las de ediciones.

## Commits

- `0b455bfc` — feat(rewind): draw a magazine link preview image for the 2025 design with a per-format share catalog
- `c9b1eb91` — test(rewind): cover the 2025 link preview image and the per-format share catalog
- `aa3e959f` — docs(api): document the 2025 link preview image and its missing story images
- `a0ce8713` — fix(rewind): keep gold on the 2025 recap frame only and draw its inner accents in the brand colour
