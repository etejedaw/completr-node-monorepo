# Rediseño de la landing

**Released:** 2026-10-13

## Summary

La página de inicio de `apps/landing` se reorganiza en torno a un tour del producto con capturas reales dentro de marcos de escritorio y celular. Las capturas pasan de `public/` a `src/assets/` en formato `.webp`, de modo que `astro:assets` genere AVIF y WebP en varios anchos durante el build. La página y el changelog comparten un encabezado de sitio.

## Added

- `SiteHeader.astro`, usado en `index.astro` y `changelog.astro`.
- `ProductTour.astro` y `MoreFeatures.astro`, que reemplazan a `HowItWorks`, `Features`, `Screenshots` y `About`.
- `DeviceFrames.astro`: marcos de ventana y de celular para las capturas.
- 12 capturas `.webp` en `src/assets/screenshots/` (backlog, calendario, queue, feed, franquicia, detalle de juego, lista y perfil, en escritorio y móvil).

## Changed

- `Hero`, `Ratio`, `OpenSource`, `BetaSignup`, `Changelog` y `Footer` se rediseñan.
- `changelog.astro` sustituye el enlace "Volver al inicio" por el encabezado de sitio.
- `styles/global.css` suma los estilos compartidos de las secciones nuevas.

## Removed

- Las seis capturas `.png` de `apps/landing/public/screenshots/`.
- Los componentes `About`, `Features`, `HowItWorks` y `Screenshots`.

## Files of interest

- `apps/landing/src/pages/index.astro`
- `apps/landing/src/components/ProductTour.astro`
- `apps/landing/src/components/DeviceFrames.astro`
- `apps/landing/src/assets/screenshots/`

## Commits

- `1979c6cb` — refactor(landing): move app screenshots to astro assets
- `6d2a4059` — feat(landing): redesign home page sections
