# Marcador de abandonado y póster de respaldo en los cerrados del Rewind 2026

**Released:** 2026-11-17

## Summary

En la sección de juegos cerrados del diseño `2026`, los abandonados solo se distinguían por el gris, lo que no alcanza para quien no percibe bien el color y se confundía con una imagen que no cargó. Ahora llevan además una insignia con una "x" roja en la esquina superior derecha. Los juegos sin arte, que se mostraban como un tile oscuro con el título, usan el mismo póster de respaldo de `app-game-poster` que el resto de la app (degradado de color, ícono y título).

## Changed

- `rewind-2026-closed-games`: cada póster abandonado suma una insignia `data-abandoned-badge` (círculo `bg-canvas/80` con ícono `close` en `text-danger`), con `aria-hidden` porque el nombre accesible del enlace ya dice "abandonado", y un `title` con el texto `timeline.abandonedBadge` en el idioma del Rewind. Se mantiene al recuperar el color con hover o foco.
- `rewind-2026-closed-games`: `app-game-poster` se usa siempre, también sin URL, para que el respaldo de color reemplace al tile oscuro.
- `rewind-copy`: nuevo `timeline.abandonedBadge` ("Abandoned" / "Abandonado").

## Removed

- El tile `data-poster-placeholder` de los juegos sin arte.

## Commits

- `a3d863a5` — feat(rewind): mark abandoned 2026 closed games with a red badge and use the coloured fallback poster for games without art
