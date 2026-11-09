# Portadas de RAWG sin imágenes rotas

**Released:** 2026-11-08

## Summary

Las miniaturas de algunos juegos poco conocidos salían rotas en el feed, el backlog y el resto de las listas, mientras que la página del juego las mostraba bien. `CoverUrlPipe` pedía las miniaturas a `media.rawg.io/media/resize/200/-/...`, y `media.rawg.io` solo tiene generados de antemano los tamaños 420, 640 y 1280 de todos los juegos. Si un tamaño no existe, responde con un 307 hacia `api.rawg.io`, que lo genera en el momento; la CSP bloqueaba esa redirección, y `api.rawg.io` además respondía 522. La página del juego no fallaba porque usa 420, 640 y 1280. El cambio ataca el problema por tres lados: las portadas se piden a 420 como mínimo, `GamePoster` tiene un respaldo cuando la imagen no carga y la CSP permite `api.rawg.io` para cuando RAWG lo vuelva a servir.

## Highlights

- Ninguna vista pide portadas de 200; el ancho mínimo es 420.
- `GamePoster` cae a la URL original y, si tampoco carga, al degradado con el título, en vez de mostrar una imagen rota.
- La CSP y el service worker aceptan `api.rawg.io`.

## Changed

- `CoverUrlPipe` acepta 420, 640 y 1280 (por defecto 420) y el input `width` de `GamePoster` acepta 420 y 640. Los 40 usos de `[width]="200"` pasan a 420.
- `security-headers.conf`: `https://api.rawg.io` en `img-src` y en `connect-src`. `connect-src` hace falta porque el service worker descarga las imágenes con `fetch`.
- `ngsw-config.json`: el grupo `rawg-images` cachea también `https://api.rawg.io/media/**`.
- `docs/rules.md` documenta el mínimo de 420 y por qué `api.rawg.io` está en la CSP.

## Fixed

- `GamePoster` tiene una cadena de respaldo: primero la URL redimensionada, después la original y por último el degradado con el título. Las URLs que fallaron se guardan en un `linkedSignal` que se reinicia cuando cambia `src`, así que en una lista que reutiliza el componente el error de un juego no pasa al siguiente. El handler lee la URL del `<img>` que falló, y por eso dos errores seguidos de la misma imagen cuentan una sola vez.

## Files of interest

- `apps/web/src/app/shared/components/game-poster/game-poster.ts`
- `apps/web/src/app/shared/pipes/cover-url.ts`
- `apps/web/security-headers.conf`
- `apps/web/ngsw-config.json`

## Commits

- `a7a11883` — fix(web): allow api.rawg.io in img-src and connect-src
- `2f37c911` — fix(web): cache api.rawg.io media in the rawg-images data group
- `1d1f0af3` — fix(web): drop the 200 width from the cover url pipe
- `45fc2648` — fix(web): fall back to the original cover and then the placeholder in game poster
- `37eed19e` — docs(rules): document the 420 minimum width for rawg covers
- `0fa358e8` — fix(web): request rawg covers at 420 width instead of 200
