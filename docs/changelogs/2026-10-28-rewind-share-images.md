# Imagen y enlace para compartir el Rewind

**Released:** 2026-10-28

## Summary

El Rewind se comparte como imagen generada en la API, no en el navegador: así sale idéntica en cualquier dispositivo, no depende de CORS para las portadas de RAWG y la misma pieza sirve de vista previa cuando se pega el enlace en una red social. El módulo nuevo `rewind-share` toma el `Rewind` del service de `rewind` (con la misma privacidad que el JSON), arma la composición con satori y la rasteriza con resvg. Hay dos formatos: story 1080×1920 para Instagram y OG 1200×630 para las vistas previas. Las fuentes son Chakra Petch y Manrope de `@fontsource` en `.woff` estático, las portadas y el arte de fondo se descargan con timeout de 3 s y fallback, y los PNG quedan en una caché LRU en memoria.

## Highlights

- `GET /users/:username/rewinds/:year/story.png` y `/og.png`, con los mismos errores y privacidad que el detalle.
- `GET /share/rewind/:username/:year`: HTML con meta OG y Twitter que redirige a la web; versión genérica si un anónimo no puede ver el Rewind.
- Diseño de póster de fin de temporada: arte del juego mejor puntuado de fondo, año con degradado, persona como rango, abanico de portadas con el mejor puntuado al frente y cifras en bloques de color.

## Added

- Módulo `apps/api/src/rewind-share/`: controller, routes, service (render, caché LRU de ~100 entradas con deduplicación de renders simultáneos y página de vista previa) y plantillas `story`, `og`, `cover-fan`, `persona-badge`, `stat-tiles` y `share-page`.
- Dependencias `satori`, `@resvg/resvg-js`, `@fontsource/chakra-petch` y `@fontsource/manrope` en `apps/api`.
- Variable `API_PUBLIC_URL` para las URLs absolutas de `og:image`.
- Bruno: `docs/api/rewind-share/`.

## Changed

- `rewind-share` reutiliza `RewindYearParamsSchema` de `rewind` en lugar de una copia propia.
- La imagen pasó de un diseño plano (año, cuatro portadas y un tally con línea de puntos) al póster con arte de fondo, persona y bloques de color. El abanico se ordena desde el centro por importancia.

## Fixed

- resvg abortaba el proceso con `boxShadow` sobre una portada rotada con recorte: la sombra y la rotación van en un contenedor exterior y el recorte en una cara interior.
- El arte de fondo se pinta como capas del `backgroundImage` de la raíz, porque satori pintaba una capa absoluta por encima del contenido.

## Migration

- Definir `API_PUBLIC_URL` en producción con la URL pública de la API. Sin ella, la vista previa de los enlaces apunta a `http://localhost:3000`.
- La imagen Docker instala `@resvg/resvg-js` con su binario nativo para la plataforma del contenedor; no se copia `node_modules` desde otra máquina.

## Files of interest

- `apps/api/src/rewind-share/rewind-share.service.ts`
- `apps/api/src/rewind-share/templates/story.template.ts`
- `apps/api/src/rewind-share/templates/cover-fan.template.ts`
- `apps/api/src/rewind-share/utils/select-share-covers.util.ts`
- `docs/architecture.md`

## Commits

- `dc6ed7e3` — build(api): add satori, resvg and font packages for rewind share images
- `57ff9a4b` — feat(api): add API_PUBLIC_URL environment variable
- `42a70bbe` — feat(rewind-share): add rewind share images and link preview page
- `3ca0fb2a` — test(rewind-share): cover image rendering, cache and share page
- `108d5247` — docs(rewind-share): document share endpoints and image rendering
- `5757ec39` — refactor(api): reuse the rewind year params schema in rewind share
- `1d9a7c99` — test(api): cover rewind share endpoints against the real rewind
- `daf11e43` — feat(rewind-share): redesign share images as an end-of-season poster with art, persona and stat tiles
- `ba1c09dc` — test(rewind-share): cover personas, background art and stat tiles in share images
- `64d93d38` — feat(rewind-share): put the top rated game at the front of the cover fan with a caption
- `3618ed4b` — feat(rewind-share): drop the top rated caption and restore the full cover fan
