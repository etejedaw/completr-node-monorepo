# Juegos abandonados en el Rewind

**Released:** 2026-11-16

## Summary

El Rewind ahora lista los juegos abandonados del año. La API devuelve `abandonedGames` en el Rewind en vivo y en la foto congelada (las fotos congeladas antes de este cambio se leen como lista vacía). El diseño `2026` los muestra en gris dentro de su mes, con el encabezado "Cerrados en <año>", y el diseño `2025` agrega una sección sobre lo que el usuario dejó atrás después de los estantes.

## Highlights

- `abandonedGames` en el Rewind en vivo y congelado.
- Diseño `2026`: abandonados en gris dentro de su mes.
- Diseño `2025`: sección "What you left behind" (en español, "Los que soltaste").

## Added

- API: `abandonedGames` en `rewind.interface.ts`, `rewind.serializer.ts` y `build-rewind.util.ts`, armado con `listLatestFinishedRuns` sobre las runs abandonadas del año.
- Web: `abandonedGames` en `rewind.model.ts`, textos de línea de tiempo y de "Cerrados en <año>" en `rewind-copy.ts`, y el componente `rewind-2025-left-behind` en el diseño `2025`.
- Tests de `build-rewind`, de la foto congelada, de integración del Rewind y de ambos diseños.

## Changed

- `rewind-finished-games` y `rewind-design-2026` dibujan los abandonados dentro de su mes.
- `build-rewind-view-games.util.ts` y `build-rewind-view.util.ts` pasan los abandonados al snapshot.
- `docs/api/rewind/get-user-rewind.yml` documenta el campo.
- `docs/rules.md` explica que un juego abandonado y terminado el mismo año aparece en las dos listas, y que para mostrar los abandonados de una foto antigua hay que volver a congelarla.

## Files of interest

- `apps/api/src/rewind/utils/build-rewind.util.ts`
- `apps/web/src/app/features/rewind/components/rewind-finished-games/rewind-finished-games.ts`
- `apps/web/src/app/features/rewind/components/rewind-design-2025/rewind-2025-left-behind/rewind-2025-left-behind.ts`

## Commits

- `5412523b` — feat(rewind): list the abandoned games of the year in the live and frozen rewind
- `96375854` — docs(api): document the abandoned games of the rewind
- `00d296b0` — feat(rewind): show abandoned games in gray inside the 2026 timeline
- `b8bc0c6d` — feat(rewind): add the what you left behind section to the 2025 design
- `5d344196` — docs(rules): explain how abandoned games appear in the rewind
