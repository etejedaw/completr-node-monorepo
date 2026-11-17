# Platinos del año en el Rewind y rediseño de Lo más destacado

**Released:** 2026-11-17

## Summary

El Rewind solo contaba los platinos del año; ahora trae la lista (`platinumGames`), y cada diseño la muestra justo después de "Lo más destacado". La lista sale de la misma consulta que el conteo, así que `totals.platinums` siempre es su largo, y sigue el acceso en vivo a la sección de platinos: `null` sin acceso, `[]` sin platinos. Las fotos congeladas guardan la lista; las anteriores a este cambio se leen como lista vacía hasta que se vuelvan a congelar. En la web, el diseño 2025 rehace "Lo más destacado" como portada y columnas, con los platinos como tarjeta o tira; el 2026 suma los platinos como una fila más de su grilla de récords en vez de una sección aparte.

## Added

- `game-platinum.service`: `findPlatinumsByUserIdAndYear`, con el juego y la plataforma, ordenados por fecha y luego por id.
- API: `Rewind.platinumGames: RewindPlatinumGame[] | null` (referencia del juego, `platinumedAt`, `platformAbbreviation`), en vivo y en las dos fotos congeladas (dueño y visitante); nunca devuelve las notas del platino.
- Web: `RewindPlatinumGame` en `rewind.model.ts`.
- `rewind-2025-platinums`: platinos del 2025 con el conteo en el título; uno es una tarjeta horizontal y varios, una tira deslizable.
- `rewind-2026-platinum-record`: fila de platinos dentro de `rewind-2026-highlights` (conteo, "Platinos del año", juego y fecha; con varios, portadas cuadradas con su fecha).

## Changed

- `rewind-2025-awards`: "El más largo" pasa a portada apaisada con su valor sobre un velo; el resto de los récords son pósters con pie (récord, título, valor), sin el valor sobre el arte; los cuatro datos del año van en una sola línea.
- Diseño 2026: vuelve la frase resumen del hero.
- Colección Bruno: `get-user-rewind` documenta `platinumGames` y su privacidad.
- `docs/rules.md`: de dónde sale la lista de platinos y el catálogo de share por formato.

## Removed

- `rewind-2026-platinums`: la sección de platinos aparte del 2026, reemplazada por la fila dentro de la grilla.

## Migration

- Las fotos congeladas antes de este cambio muestran la lista vacía; para que muestren sus platinos hay que volver a congelarlas.

## Commits

- `00001bf2` — feat(game-platinum): list a user's platinums of a year with their game and platform
- `0bcddb60` — feat(rewind): add the platinum games of the year to the live and frozen rewind
- `fda294f2` — docs(api): document the rewind platinum games and their privacy
- `97992de9` — feat(rewind): add the platinum games to the web rewind model
- `ffea4868` — feat(rewind): add the 2026 platinums section and restore the hero summary sentence
- `b19a7e60` — feat(rewind): add the 2025 platinums magazine page
- `a26e4e6b` — test(rewind): cover the platinums sections and the 2026 hero summary in both designs
- `5246aa88` — docs(rules): explain the per-format share catalog and where the rewind platinum list comes from
- `ea54b6cb` — feat(rewind): place the 2025 platinums right after the highlights like the 2026 section
- `514a323b` — feat(rewind): redesign the 2025 highlights and platinums as a cover with columns
- `3f9095a3` — feat(rewind): move the 2026 platinums into the records grid as a record row
- `33a48893` — test(rewind): find the 2025 platinums by their new count heading
