# Franchise tracker

**Released:** 2026-07-06

## Summary

Se agregó una taxonomía de franquicias (sagas) para seguir el progreso por saga, ej. "Resident Evil: 6/12 completados". El modelo `Franchise` es una entidad de catálogo; cada `Game` gana un FK opcional `franchiseId` (una franquicia por juego). Se construyó el módulo `franchises` completo siguiendo el patrón de `genres`: modelo, servicio, controller, rutas, schemas, DTOs y las cinco capas de errores, registrado en `server.ts` y en los normalizers globales.

El progreso reutiliza la semántica de listas: `completed` cuenta los juegos del usuario en status `completed`/`abandoned`/`endless` sobre el total de juegos activos de la franquicia. El detalle de franquicia devuelve sus juegos paginados con el `backlogStatus` del viewer por juego; la ficha del juego expone `franchise` + `franchiseProgress`.

En una segunda iteración, la sección "Sagas" del perfil pasó de automática a **opt-in**: se agregó el join `UserFranchise` (track/untrack) para que el usuario elija qué franquicias aparecen en su perfil. `GET /users/:username/franchises` ahora devuelve solo las inscritas (con progreso, aunque sea 0/N). El detalle de franquicia expone `isTracked` y la ficha del juego `franchiseTracked` para pintar el toggle. El frontend consume todo esto con un badge en la ficha, la página `/franchises/:code`, una pestaña "Sagas" en el perfil, y gestión admin (CRUD de franquicias + selector en el editor de juegos).

## Highlights

- Modelo `Franchise` + `franchiseId` (FK nullable) en `Game`; asignación vía `PATCH /games/:id`.
- CRUD de franquicias para admin/moderator, más detalle público con progreso por usuario.
- Tracking opt-in (`UserFranchise`): el usuario elige qué sagas se muestran en su perfil.
- La ficha del juego y el detalle de franquicia exponen progreso y estado de tracking del viewer.

## Added

- Modelos `Franchise` y `UserFranchise` (unique `userId`+`franchiseId`); columna `Games.franchiseId` con FK `ON DELETE SET NULL`.
- Endpoints: `GET /franchises`, `GET /franchises/:code`, `POST/PATCH/DELETE /franchises` (moderator), `POST/DELETE /franchises/:code/track`.
- `GET /users/:username/franchises` — franchises inscritas del perfil con progreso.
- Campos en `GET /games/:code`: `franchise`, `franchiseProgress`, `franchiseTracked`. `franchiseId` aceptado en `PATCH /games/:id`.
- Helpers en `games` (`findGamesByFranchiseId`, `findFranchiseIdsForGameIds`, `countActiveGamesByFranchiseIds`) y en `backlog` (`findDistinctGameIdsByUserAndStatuses`).

## Migration

- `20260706223230-create-franchises-and-add-franchiseid-to-games` — tabla `Franchises` + columna `Games.franchiseId` + índice.
- `20260706230218-create-user-franchises` — tabla `UserFranchises` con unique `(userId, franchiseId)`.

## Files of interest

- `src/franchises/` — módulo completo (modelos, service, controller, routes, schemas, errores).
- `src/games/services/games-search.service.ts` — queries por franquicia.
- `src/games/games.controller.ts` — `franchiseProgress` / `franchiseTracked` en el detalle.
- `src/users/users-profile.service.ts` — `getFranchisesForUsername` (solo inscritas).
- `docs/api/franchises/`, `docs/api/users/franchises.yml`, `docs/api/games/get-by-code.yml`.

## Commits

- `9a88af9` — feat(db): add franchises table and games.franchiseId column
- `afae4b7` — feat(franchises): add franchise module with crud, detail and progress
- `acd085b` — feat(games): link games to franchises and expose franchise progress
- `b69b811` — feat(users): add franchise progress section to profile
- `2e85e3e` — docs(api): document franchise endpoints and franchise fields on games
- `8bd2f24` — feat(db): add user-franchises table for franchise tracking
- `77debe8` — feat(franchises): add opt-in franchise tracking
- `6b88f95` — docs(api): document franchise tracking endpoints and tracked fields
