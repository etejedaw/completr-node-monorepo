# Highlights enhancements: month navigation and completions view

**Released:** 2026-06-18

## Summary

Dos extensiones del tab Highlights del perfil publico: navegacion historica de meses anteriores con sync URL, y vista dedicada paginada del historial completo de completados. Resuelve FB-030 y FB-031. Ambos cambios respetan la privacidad existente (`isBacklogPublic`) y reutilizan los serializers de `backlog`.

## Highlights

- Flechas `◀ ▶` alrededor del titulo del mes en Highlights; la flecha futura se deshabilita en el mes actual.
- Sync URL `?highlightsMonth=YYYY-MM` para deep-linking; el param se limpia al volver al mes actual.
- Nueva ruta `/user/:username/completions` con timeline vertical paginada y review excerpts.
- Link "See all" en la seccion "Recent completions" apuntando a la nueva vista.

## Added

- `HighlightsQuerySchema` (`year` 1970-9999, `month` 1-12) con refine "both or neither" en `src/users/schemas/`.
- `GET /users/:username/highlights?year=&month=` — el bloque `month` recalcula `completedCount`, `mostPlayed` y `highestRated` para el rango especificado; `recent` siempre devuelve los ultimos 6.
- `findCompletionsByUserIdPaginated(userId, includePrivate, { limit, offset })` en `backlog.service.ts` — `status = "completed"`, `finishedAt != null`, orden `finishedAt DESC`, default 20, max 100.
- `GET /users/:username/completions` (`PaginationQuerySchema`) — cada entry incluye `reviewContent` cruzado contra `findReviewContentByUserAndGameIds`.
- Frontend: nueva ruta `user/:username/completions` y componente `UserCompletions` standalone con `ui-pagination`, layout timeline (border-l con dots verdes `check_circle`, poster + score + fecha/duracion/plataforma inline + review excerpt con `line-clamp:3`).
- Frontend: helpers `currentMonth`, `parseMonthParam`, `formatMonthParam`, `syncHighlightsMonthInUrl` en `PublicProfileComponent`.
- Frontend: link "See all" en la seccion "Recent completions" del tab Highlights.

## Changed

- `findHighlightsByUserId` ahora acepta `options: { recentLimit?, year?, month? }`. `monthEnd` cierra en `23:59:59.999` (corrige bug latente donde las entradas del ultimo dia del mes se perdian al cerrar en `00:00:00`).
- Frontend: signal `highlightsMonth` reactivo; `refetchHighlights()` se dispara al navegar.

## Fixed

- Bug latente en highlights: el calculo de `monthEnd` excluia las entradas finalizadas durante el ultimo dia del mes.

## Files of interest

### Backend

- `src/users/schemas/highlights-query.schema.ts`
- `src/users/users.controller.ts` — `getUserHighlights` con params + `getUserCompletions` con merge de reviewContent.
- `src/users/users.routes.ts` — rutas `GET /users/:username/highlights` y `GET /users/:username/completions`.
- `src/backlog/backlog.service.ts` — `findCompletionsByUserIdPaginated` y firma extendida de `findHighlightsByUserId`.
- `docs/api/users/get-user-highlights.yml` y `docs/api/users/get-user-completions.yml`.

### Frontend (completr-node-frontend)

- `src/app/features/public-profile/user-completions/user-completions.ts|html`
- `src/app/features/public-profile/public-profile.ts` — month navigation signals + helpers.
- `src/app/features/public-profile/public-profile.service.ts` — `getHighlights` con params + `getUserCompletions`.
- `src/app/app.routes.ts` — ruta `user/:username/completions`.

## Commits

### Backend

- `5790aa6` — feat(highlights): support year and month query params for month navigation
- `8a60f20` — docs(api): document highlights month navigation params
- `d494f92` — feat(completions): paginated user completions endpoint with review excerpts
- `0fbf9fd` — docs(api): document user completions endpoint

### Frontend (completr-node-frontend)

- `f3bb4dde` — feat(profile): navigate previous months in highlights with url sync
- `852bcb82` — feat(profile): dedicated completions timeline view with see-all link
