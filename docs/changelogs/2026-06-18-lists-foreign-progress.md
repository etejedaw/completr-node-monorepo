# Lists viewed from another profile: foreign progress and compare mode

**Released:** 2026-06-18

## Summary

Cuando se abre una lista desde el perfil de otro usuario (URL `/lists/<id>?from=username`), la vista ahora hace explicito que el progreso visible NO es el del viewer. Banner persistente arriba, status pills con opacidad reducida + sufijo "by @user", y modo "Compare" opcional que muestra ambos progresos lado a lado. Resuelve FB-032. Frontend-only — el backend ya exponia los dos endpoints necesarios.

## Highlights

- Banner persistente con icono `visibility` y link al perfil de origen cuando `?from=` distinto del viewer.
- Botones "See my progress" (limpia `from` y `compare` de la URL) y "Compare" (solo si hay viewer logueado).
- Modo Compare con `?compare=1`: fork-join de `getById` (viewer) + `getByIdForUser` (from-user), dos progress bars y dos pills inline por item ("You: <status>" + "@user: <status>").
- En modo ajeno simple, cada status pill se rendea con `opacity-75` + sufijo "by @user"; el boton "Add to Backlog" se reemplaza por "Add to my Backlog" (la unica accion valida para el viewer).

## Added

- Frontend: signals `compareMode`, `viewerProgress` (Map por gameId), `viewerListProgress`.
- Frontend: computeds `viewerUsername`, `showComparisonBanner`, `canCompare`.
- Frontend: handlers `goToOwnProgress()`, `enterCompareMode()`, `exitCompareMode()` con sync URL via `router.navigate({ queryParamsHandling: "merge", replaceUrl: true })`.
- Frontend: helper `buildProgressMap(items)` que indexa el progreso del viewer por `gameId`.

## Files of interest

### Frontend (completr-node-frontend)

- `src/app/features/lists/list-detail/list-detail.ts` — toda la logica de compare + banner.
- `src/app/features/lists/list-detail/list-detail.html` — banner, pills duales y dos progress bars en modo compare.

## Commits

### Frontend (completr-node-frontend)

- `405d05f1` — feat(lists): distinguish foreign progress with banner and compare mode
