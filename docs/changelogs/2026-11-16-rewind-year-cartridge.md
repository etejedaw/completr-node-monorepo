# Tarjeta de año del Rewind como cartucho

**Released:** 2026-11-16

## Summary

La tarjeta de cada año del Rewind (archivo, "More Rewinds" y la sección del perfil) pasa a ser un cartucho de consola: carcasa oscura con muesca y ranuras, una etiqueta con el borde en el tono del año, el arte del primer juego y la franja con el año y la persona. Mantiene sus estados, entradas y salidas.

## Highlights

- El arte usa `backgroundUrl ?? coverUrl` del primer juego y cae a `coverUrl` y luego a un placeholder rayado si la imagen falla.
- Sin generar o bloqueado: placeholder con "?" y el CTA o el motivo, sin portadas ni persona.
- En el teléfono, el archivo y "More Rewinds" apilan los cartuchos; el perfil mantiene el carrusel con tarjetas más anchas.

## Changed

- `rewind-year-card` (plantilla, estilos y copy `hours`); el fallback del arte usa un `linkedSignal` que se reinicia al cambiar de año.
- `rewind-archive`, `rewind-more-years` y `profile-rewinds`: grilla de una columna en el teléfono.

## Removed

- `TONE_TINT_CLASS` de `rewind-tone.ts`, que quedó sin uso.

## Files of interest

- `apps/web/src/app/features/rewind/components/rewind-year-card/rewind-year-card.html`
- `apps/web/src/app/features/rewind/components/rewind-year-card/rewind-year-card.ts`

## Commits

- `c717d217` — feat(rewind): redesign the year card as a game cartridge
- `0f1c9838` — feat(rewind): stack the year cartridges on phones
