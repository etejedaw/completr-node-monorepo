# Escala del Ratio en stats y Month in review del perfil

**Released:** 2026-10-24

## Summary

El ratio de cada juego se calcula en escala 0–100 (`score × 20 / horas`, con `calculateRatio`), pero las stats agregadas de las vistas guardadas dividían la nota por las horas sin normalizar, así que "Best personal ratio", "Avg ratio" y "Avg personal ratio" salían 20 veces más chicos que el ratio de la tabla. Ahora usan la misma escala. Además, el "Month in review" del perfil se alinea con los highlights de las vistas guardadas: `mostPlayed` pasa a `longestPlayed` y se suma `bestPersonalRatio`. La landing muestra el ×20 en la fórmula del Ratio.

## Highlights

- `avgRatio`, `avgPersonalRatio` y `bestPersonalRatio` de las stats en escala 0–100 y con 2 decimales.
- "Month in review" con los mismos tres highlights que las vistas guardadas: "Longest played", "Best personal ratio" y "Highest rated".
- La fórmula de la landing pasa a `nota × 20 ÷ horas para terminarlo`.

## Changed

- `calculate-ratio.util.ts` exporta `RATIO_SCORE_MULTIPLIER` (`TARGET_SCALE / DEFAULT_SOURCE_SCALE`).
- `computeBacklogStats`: `avgRatio` y `avgPersonalRatio` se calculan como `ROUND((AVG(score / NULLIF(...)) * RATIO_SCORE_MULTIPLIER)::numeric, 2)`. El cast a `numeric` es necesario porque Postgres no tiene `ROUND(double precision, int)`. `bestPersonalRatio` usa `calculateRatio(score, realDuration)`.
- `findHighlightsByUserId` y `userHighlightsSerializer`: `highlights.month` pasa a `{ startsAt, endsAt, completedCount, longestPlayed, bestPersonalRatio, highestRated }`. `bestPersonalRatio` es la entrada completada del mes con mayor ratio personal, o `null` si ninguna tiene `realDuration`.
- `ProfileMonthReview` reemplaza los ternarios por una lista de definiciones (`highlights()`), suma el input `bestPersonalRatio` y pasa la grilla a 4 piezas: una columna en mobile, 2×2 desde `sm` y una fila desde `lg`. Las cards vacías anuncian el nombre del highlight a lectores de pantalla.
- `HighlightEntry` suma `personalRatio` y `PublicProfileComponent` reutiliza `HighlightsData` en vez de repetir el tipo.
- `Ratio.astro`: la fórmula y los textos explican que la nota se lleva a escala 100 antes de dividir por las horas.

## Fixed

- "Best personal ratio", "Avg ratio" y "Avg personal ratio" de las vistas guardadas mostraban valores 20 veces menores que el ratio de cada juego.

## Migration

- Breaking en `GET /users/:username/highlights`: `month.mostPlayed` se renombra a `month.longestPlayed`. El único consumidor es `apps/web`, actualizado en el mismo cambio.

## Files of interest

- `apps/api/src/backlog/backlog.service.ts`
- `apps/api/src/users/users.serializer.ts`
- `apps/web/src/app/features/public-profile/components/profile-month-review.ts`
- `apps/landing/src/components/Ratio.astro`
- `docs/api/users/get-user-highlights.yml`
- `docs/api/saved-filters/get-stats.yml`

## Commits

- `19247949` — fix(landing): show the x20 scale in the ratio formula and copy
- `8c6a2944` — feat(backlog): scale aggregate ratios to 0-100 and add best personal ratio to month highlights
- `3945bb33` — test(backlog): cover 0-100 aggregate ratios, longest played and best personal ratio highlights
- `4fcc3d4a` — docs(api): document 0-100 aggregate ratios and month highlights longestPlayed and bestPersonalRatio
- `7f6f6d89` — feat(web): show longest played, best personal ratio and highest rated in month review
- `26602306` — test(web): cover month review highlights and empty cards
