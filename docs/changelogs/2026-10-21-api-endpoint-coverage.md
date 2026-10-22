# Cobertura de endpoints de la API

**Released:** 2026-10-21

## Summary

Tests de integración para los endpoints de la API que no tenían ninguno: actividad del feed, notas de progreso, follows de listas, reportes de juegos, perfil público, búsqueda de usuarios, catálogo público y administración. Cada endpoint cubre el caso feliz, la validación, la autenticación, los permisos o la privacidad, el recurso inexistente y los efectos verificables en lecturas posteriores. Los bugs que destaparon se corrigieron en `2026-10-21-api-social-and-list-privacy` y `2026-10-21-api-catalog-integrity`.

## Highlights

- Cobertura de las notas de progreso, el borrado de actividad del feed, la edición y baja de follows de listas y el alta de reportes.
- Matriz de privacidad (anónimo, desconocido, solicitud pendiente, seguidor unidireccional, mutuo y dueño) en highlights, completions, sagas, comparación y detalle de lista del perfil público.
- Lecturas públicas del catálogo: listado de juegos con todos sus filtros y órdenes, búsqueda, detalle, showcase, últimos reseñados, géneros, plataformas, fuentes y lecturas de scores y tiempos.
- Matriz de roles del admin (admin, moderador, usuario común y anónimo) en usuarios, jobs, auditoría, reportes, invitaciones y escrituras de catálogo.

## Added

- `apps/api/test/backlog-progress/`, `apps/api/test/activity/activity.integration.test.ts` y `apps/api/test/game-reports/`.
- `apps/api/test/list-followers/list-followers.integration.test.ts`: `PATCH` y `DELETE /lists/:listId/follow`.
- `apps/api/test/users/`: `users-search`, `users-deactivate`, `users-profile` y `users-comparison`.
- `apps/api/test/games/`: `games-list`, `games-search`, `games-detail`, `games-showcase`, `games-showcase-unrated`, `games-latest-reviewed` y `games-community`.
- `apps/api/test/genres/`, `apps/api/test/platforms/`, `apps/api/test/score-sources/` y las lecturas de `apps/api/test/game-scores/` y `apps/api/test/game-times/`.
- `apps/api/test/admin/`: un archivo por área (`admin-users`, `admin-jobs`, `admin-audit`, `admin-game-reports`, `admin-invitations`, `admin-games`, `admin-catalog`), incluida la creación de invitaciones con correo en memoria, su aceptación y su reenvío.

## Files of interest

- `apps/api/test/admin/`
- `apps/api/test/games/games-community.integration.test.ts`
- `apps/api/test/users/users-profile.integration.test.ts`

## Commits

- `e0b886ca` — test(activity): add integration tests for deleting feed activity
- `5b2c5654` — test(list-followers): cover editing and removing a list follow
- `0c32515a` — test(game-reports): add integration tests for reporting a game
- `c9c2446a` — test(users): add integration tests for user search and discover
- `931c6965` — test(users): add integration tests for account deactivation
- `e17f6764` — test(users): add integration tests for profile highlights, completions, franchises and list detail
- `6e063ce0` — test(users): add integration tests for profile comparison
- `075d40c6` — test(api): add integration tests for games list, search and detail
- `7e2b0310` — test(api): add integration tests for games showcase and latest reviewed
- `09ddb1e1` — test(api): add integration tests for game lists, friends activity and players privacy
- `42adbc6f` — test(api): add integration tests for genres
- `4bbeb690` — test(api): add integration tests for platforms
- `f7dc3011` — test(api): add integration tests for score sources
- `19651b53` — test(api): add integration tests for game scores and times reads
- `ce2f9f31` — test(api): add admin users integration tests
- `ddb4b262` — test(api): add admin jobs integration tests
- `69806b98` — test(api): add admin audit integration tests
- `5f7e3ae0` — test(api): add admin game reports integration tests
- `280e672b` — test(api): add admin invitations integration tests
- `34cc914c` — test(api): add admin games integration tests
- `78dafa89` — test(api): add admin catalog integration tests
- `a42cbbd2` — test(api): cover admin invitations creation, acceptance and role matrix
