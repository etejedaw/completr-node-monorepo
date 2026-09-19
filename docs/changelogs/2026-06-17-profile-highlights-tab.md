# Tab Highlights del perfil

**Released:** 2026-06-17

## Summary

Nuevo tab "Highlights" en el perfil con los últimos juegos completados y un resumen del mes. El backend expone `GET /users/:username/highlights` con autenticación opcional; para quien no es el dueño solo cuentan entries públicas. La navegación por meses y el historial completo llegaron después en `2026-06-18-highlights-enhancements.md`.

## Added

- `GET /users/:username/highlights`: `recent` (los 6 completados más recientes por `finishedAt`) y `month` (`completedCount`, `mostPlayed` por `realDuration`, `highestRated` por `userRating`) del mes en curso (UTC).
- Tab Highlights en `public-profile` con los completados recientes y la card del mes.

## Changed

- Ícono del tab: se reemplaza el primero por un trofeo y luego por `insights`.

## Files of interest

- `apps/api/src/backlog/backlog.service.ts`
- `apps/api/src/users/users.routes.ts`
- `apps/web/src/app/features/public-profile/public-profile.html`
- `docs/api/users/get-user-highlights.yml`

## Commits

### Backend

- `e08e6428` — feat(users): add highlights endpoint with recent completions and monthly stats
- `3d2156cb` — docs(api): document user highlights endpoint in bruno collection

### Frontend

- `773cd4ab` — feat(public-profile): add highlights tab with recent and monthly completions
- `4b9e50cb` — fix(public-profile): replace ai-flavored highlights icon with trophy
- `e0858dd2` — fix(public-profile): switch highlights tab icon to insights
