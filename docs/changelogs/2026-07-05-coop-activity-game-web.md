# Juego en la actividad de co-op (frontend)

**Released:** 2026-07-05

## Summary

Complemento de frontend de `2026-07-05-coop-activity-game.md`. Las actividades `coop_tagged` muestran el juego en el feed y en el perfil, y el resumen de una entry del backlog muestra con quién se jugó.

## Added

- Compañeros de co-op en el modal de resumen de una entry.

## Fixed

- Las entradas `coop_tagged` del feed y del perfil muestran el juego (`metadata.game`).

## Files of interest

- `apps/web/src/app/features/feed/feed-page.html`
- `apps/web/src/app/features/public-profile/public-profile.html`

## Commits

- `15935c6a` — feat(backlog): show co-op partners in entry summary modal
- `7591a474` — fix(activity): show game in coop_tagged feed and profile entries
