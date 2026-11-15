# Highlights del Rewind: portadas, "El más clásico" y panel del dueño en inglés

**Released:** 2026-11-15

## Summary

Tres ajustes al Rewind. "El más largo" y "El más corto" muestran la portada del juego, como ya lo hacían "El primero del año" y "El último del año". Se agrega el highlight "El más clásico": el juego terminado en el año con el lanzamiento más antiguo, siempre que haya salido al menos `REWIND_CLASSIC_MIN_AGE_YEARS` (10) años antes; ocupa la columna que liberan Plataformas al pasar de 3 a 2 columnas. Y el panel del dueño deja de seguir el idioma del Rewind: el contenido del año sigue siendo bilingüe, pero los controles alrededor (panel, fechas y distintivo Premium/Gift) van en inglés como el resto de la app.

## Added

- `highlights.classic` (`RewindClassicGame`, el juego terminado con `releaseYear`), calculado en `rewind/utils/pick-classic-game.util.ts` sobre la última run terminada de cada juego del año, con desempate por año de lanzamiento, `finishedAt` y `gameId`. Los juegos sin año de lanzamiento no cuentan.
- La foto congelada lo incluye porque sale de `buildRewind`; una foto anterior sin el campo se sirve como `classic: null` (`RewindStoredHighlights`).
- Tarjeta "The classic" / "El más clásico" en `rewind-highlights`, con portada, título y "Released in" / "Lanzado en"; ocupa el ancho completo en mobile.

## Changed

- Los spans de la grilla de highlights: el hueco de una fila lo absorbe primero una tarjeta de lista (`WIDE_STRETCH_FIRST`: géneros y plataformas) y, si no hay, la última tarjeta como antes. Sin "El más clásico" el resultado es idéntico al anterior.
- "El más largo" y "El más corto" usan una grilla propia: en mobile la portada va chica junto a la etiqueta y el número y el título usan todo el ancho; en desktop la portada va al costado. El título baja a dos líneas antes de cortarse.
- `rewind-owner-panel`: una sola copia en inglés (`REWIND_OWNER_PANEL_COPY`), fechas y distintivo en inglés, y el chip de idioma dice "In English" o "In Spanish". Sale el atributo `lang` del panel.

## Files of interest

- `apps/api/src/rewind/utils/pick-classic-game.util.ts`
- `apps/web/src/app/features/rewind/components/rewind-highlights/rewind-highlights.ts`
- `apps/web/src/app/features/rewind/components/rewind-owner-panel/rewind-owner-panel.copy.ts`

## Commits

- `476945f5` — feat(rewind): show the game cover on the longest and shortest highlights
- `fde93a23` — feat(rewind): pick the oldest finished game of the year as the classic highlight
- `479c624b` — test(rewind): cover the classic highlight, its threshold and old snapshots
- `1b18ea0b` — docs(api): document the classic rewind highlight in Bruno collection
- `b74629c0` — feat(rewind): add the classic highlight card and keep platforms in two columns
- `66c0e2c8` — test(rewind): cover the classic card and the highlight row layouts
- `dc42eaca` — fix(rewind): keep the owner panel in english whatever the rewind language
- `d6c7d311` — test(rewind): check the owner panel stays in english for spanish rewinds
