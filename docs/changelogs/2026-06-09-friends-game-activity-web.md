# Actividad de amigos por juego (frontend)

**Released:** 2026-06-09

## Summary

Complemento de frontend de `2026-06-09-friends-game-activity.md`. Consume los endpoints `friends-activity` y `games-in-common` en la ficha del juego y en el perfil de otros usuarios.

## Added

- Panel "Played by Friends" en `game-detail` con los usuarios seguidos que jugaron el juego.
- Sección "Games in Common" en el perfil de otros usuarios (`public-profile`).

## Files of interest

- `apps/web/src/app/features/games/game-detail/game-detail.ts`
- `apps/web/src/app/features/public-profile/public-profile.service.ts`

## Commits

- `645fdf98` — feat(games): show Played by Friends panel on game detail
- `311c8ac9` — feat(profile): show Games in Common section on other users profiles
