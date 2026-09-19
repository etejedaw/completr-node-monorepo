# Fuentes locales y CSP

**Released:** 2026-05-24

## Summary

El service worker y la CSP chocaban: las peticiones del SW a Google Fonts y al script de analítica quedaban bloqueadas por `connect-src`. Primero se abrió `fonts.gstatic.com` en `connect-src`; la solución definitiva fue servir Space Grotesk desde el propio frontend y hacer que el script de analítica no pase por el service worker.

## Changed

- Space Grotesk se sirve desde `apps/web/public/fonts/` (subsets `latin` y `latin-ext` en `woff2`) con su propio `space-grotesk.css`.
- `index.html` deja de cargar la fuente desde Google Fonts.
- El script de analítica evita el service worker.

## Fixed

- Errores de CSP en producción al cargar fuentes y analítica con el service worker activo.

## Files of interest

- `apps/web/security-headers.conf`
- `apps/web/public/fonts/space-grotesk.css`
- `apps/web/src/index.html`

## Commits

- `d13930f1` — fix(csp): allow fonts.gstatic.com in connect-src for service worker
- `18f6163d` — fix(csp): self-host fonts and bypass sw for umami to avoid csp+sw conflict
