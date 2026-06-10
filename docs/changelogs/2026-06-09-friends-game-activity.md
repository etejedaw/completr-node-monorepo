# Actividad social entre amigos por juego

**Released:** 2026-06-09

## Summary

Agrega dos endpoints sociales para mostrar qué hacen tus amigos con los juegos. `GET /games/:id/friends-activity` lista los usuarios que sigues que han registrado el juego en su backlog, con su estado actual. `GET /users/:username/games-in-common` compara tus completados contra los del usuario consultado y devuelve la intersección. Ambos endpoints respetan privacidad de perfil. Documentados en Bruno.

## Highlights

- `GET /games/:id/friends-activity` — usuarios que sigues que jugaron este juego.
- `GET /users/:username/games-in-common` — juegos completados que tienen en común.
- Ambos respetan privacidad y se documentan en Bruno.

## Added

- **`/games/:id/friends-activity`:** lista los followed users con backlogs sobre el juego, con `status`, `rating`, `realDuration` y `finishedAt`.
- **`/users/:username/games-in-common`:** intersección de juegos completados entre el usuario actual y el target.
- **Bruno docs** para ambos endpoints.

## Files of interest

- `src/games/games.routes.ts`, `src/games/games.controller.ts` — friends-activity.
- `src/users/users.routes.ts`, `src/users/users.controller.ts` — games-in-common.
- `docs/api/games/friends-activity.yml`, `docs/api/users/games-in-common.yml`.

## Commits

- `32c420d` — feat(games): add friends-activity endpoint listing followed users who played a game
- `3d3940d` — feat(users): add games-in-common endpoint comparing completed games
- `7c28a3e` — docs(api): document friends-activity and games-in-common endpoints
