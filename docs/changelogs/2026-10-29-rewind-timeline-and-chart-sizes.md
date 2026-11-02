# Línea de tiempo del Rewind y gráficas premium del mismo tamaño

**Released:** 2026-10-29

## Summary

La sección "Terminados en <año>" pasa a ser una línea de tiempo: un riel vertical con el degradado del año recorre los meses, y cada mes tiene un nodo con ícono de calendario, su nombre y cuántos juegos cerró. En las estadísticas premium, "Reparto por género" crecía con cada género, uno por fila (15 filas en un año real), mientras que "Tú vs. la crítica" se corta en 8 juegos. Ahora el reparto muestra como máximo 8 filas, los 7 géneros principales y una fila "N géneros más" con la suma del resto, y las dos tarjetas quedan del mismo alto.

## Changed

- `RewindFinishedGames`:
    - el riel decorativo (`aria-hidden`) usa el degradado `brand → nav-queue → nav-shelf`;
    - cada nodo toma el tono de su tercio del año (`--tone`);
    - el encabezado del mes suma el conteo, con un separador `, ` solo para lectores de pantalla (antes se leía "February2 games").
- El esqueleto de carga de la sección refleja la estructura nueva.
- `genreShareRows` agrupa los géneros a partir del octavo en una fila `isOthers` en tono `fg-muted` (`GENRE_SHARE_MAX_ROWS = 8`). El recorte se hace en la web, así que vale también para las estadísticas ya guardadas.
- Las listas de "Tú vs. la crítica" y "Reparto por género" reparten sus filas en el alto de la tarjeta.

## Commits

- `a15f983d` — feat(rewind): show finished games on a year rail with a calendar node per month
- `6c3de28a` — feat(rewind): fold the genre share tail into one row and match the height of the critics chart
