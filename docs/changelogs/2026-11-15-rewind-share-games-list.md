# Rewind: segunda imagen de story con la lista de juegos

**Released:** 2026-11-15

## Summary

Al compartir el Rewind ahora hay dos imágenes de story: el resumen de siempre y una segunda con la lista de los juegos terminados del año. La API la renderiza con una plantilla nueva y un endpoint propio, y el panel de compartir de la web permite compartir y descargar ambas.

## Added

- `rewind-share`: plantilla `story-list.template.ts`, utils `remove-release-year.util.ts` y `share-copy.util.ts`, y la ruta y el handler que sirven la imagen (`rewind-share.routes.ts`, `rewind-share.controller.ts`, `rewind-share.service.ts`).
- Web: `rewind-share-copy.ts` con los textos de ambas imágenes y modelo propio en `rewind-share-actions.model.ts`.
- Documentación del endpoint en la colección Bruno (`docs/api/`).
- Tests de la plantilla, del endpoint y del flujo de compartir y descargar ambas imágenes.

## Changed

- `rewind-share-actions`: el panel de compartir y descargar maneja las dos imágenes; `rewind-design-2026` y `rewind.ts` se ajustan a ello.

## Commits

- `7b7f4f67` — feat(rewind): render a second share story with the finished games of the year
- `9a7294a7` — test(rewind): cover the games list story template and endpoint
- `964cd89e` — docs(api): document the rewind games list story in Bruno collection
- `addad44c` — feat(rewind): share and download both story images from the share panel
- `8836c448` — test(rewind): cover sharing and downloading both story images
