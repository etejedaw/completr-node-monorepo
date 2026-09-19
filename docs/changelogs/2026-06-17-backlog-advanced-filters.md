# Filtros avanzados del backlog

**Released:** 2026-06-17

## Summary

El backlog suma filtros por varias plataformas, géneros, año de lanzamiento y ratio (comunitario y personal). En el frontend, el panel de filtros de juegos se extrae a un componente compartido que usan el backlog y el catálogo, y los filtros del backlog se separan en modo básico y avanzado.

## Added

- Query params de `GET /users/me/backlog`: `platforms` y `genres` (códigos separados por coma), `release_year_from`, `release_year_to`, `min_ratio`, `max_ratio`, `min_personal_ratio` y `max_personal_ratio`.
- Componente compartido `game-filter-panel` para géneros, plataformas y años.
- Filtros de género, multi-plataforma, año y ratio en `backlog-list`, divididos en modos default y advanced.

## Changed

- `games-browse` usa `game-filter-panel` en lugar de sus chips e inputs propios.

## Files of interest

- `apps/api/src/backlog/schemas/backlog-query.schema.ts`
- `apps/api/src/backlog/backlog.service.ts`
- `apps/web/src/app/shared/components/game-filter-panel/game-filter-panel.ts`
- `apps/web/src/app/features/backlog/backlog-list/backlog-list.ts`
- `docs/api/backlog/get-my-playthroughs.yml`

## Commits

### Backend

- `33cf105f` — feat(backlog): support multi-platform, genre, year and ratio filters
- `6ccea990` — docs(api): document new backlog filter params

### Frontend

- `ac8bd15a` — feat(shared): add game-filter-panel for genre, platform and year filters
- `7779407a` — refactor(games-browse): use shared game-filter-panel for chips and year inputs
- `48b9a315` — feat(backlog-list): add genre, multi-platform, year and ratio filters
- `d7e83264` — feat(backlog-list): split filters into default and advanced modes
