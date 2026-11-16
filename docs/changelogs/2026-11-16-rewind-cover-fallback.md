# Arte de fondo como póster en el Rewind

**Released:** 2026-11-16

## Summary

Algunos juegos no tienen carátula vertical (`coverUrl`) y solo traen arte horizontal (`backgroundUrl`). El resto de la app ya usaba `coverUrl ?? backgroundUrl`, pero los pósters del Rewind y las imágenes para compartir leían solo `coverUrl` y mostraban el placeholder con el título. Ahora usan el mismo respaldo, recortado al formato del póster.

## Highlights

- Los juegos sin carátula muestran su arte en "Finished in", las tarjetas de año, los destacados, las premium stats y el spotlight del perfil.
- Las imágenes para compartir usan el arte de fondo como póster, después de los juegos con carátula y antes de los que no tienen arte.

## Fixed

- Web: `rewind-finished-games`, `rewind-year-card`, `rewind-highlights`, `rewind-premium-stats`, `profile-rewind-spotlight` y los pósters de `rewind-archive` usan `coverUrl ?? backgroundUrl`.
- API: `sharePosterUrl` (`rewind-share/utils/share-poster-url.util.ts`) elige la URL del póster; `loadCover` la descarga y `selectShareCovers` ordena y deduplica por ella. Un juego con carátula nunca descarga su arte de fondo.

## Files of interest

- `apps/api/src/rewind-share/utils/select-share-covers.util.ts`
- `apps/api/src/rewind-share/utils/share-poster-url.util.ts`
- `apps/web/src/app/features/rewind/components/rewind-finished-games/rewind-finished-games.html`

## Commits

- `1f5eb450` — fix(web): fall back to the background art for rewind posters without a cover
- `9c839820` — fix(rewind-share): fall back to the background art for share posters without a cover
