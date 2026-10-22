# Privacidad social y visibilidad de listas

**Released:** 2026-10-21

## Summary

Correcciones de privacidad encontradas por la nueva cobertura de endpoints y una regla única de visibilidad para las listas de otros usuarios. La amistad se interpreta siempre como seguimiento mutuo, las cuentas desactivadas dejan de aparecer en lo social, y una lista ajena solo se ve si se puede ver el perfil de su dueño, después su sección de listas y por último la propia lista.

## Highlights

- `friends-activity`, `players` y `GET /feed` aplican `canView` con seguimiento mutuo para las secciones `friends`.
- Regla de visibilidad de listas: perfil, luego `listVisibility`, luego `isPublic`, filtrada en la consulta para que el total y la paginación sean correctos.
- `GET /users/:username/lists/:listId` responde 404 `LIST_NOT_FOUND` para una lista inexistente, ajena o no visible.

## Fixed

- `games`: `GET /games/:id/friends-activity` y `GET /games/:id/players` ya no sirven backlogs ni perfiles `friends` a quien no es amigo mutuo, ni usuarios desactivados.
- `activity`: `GET /feed` muestra a los seguidores mutuos las actividades de autores con `feedVisibility` o `profileVisibility` en `friends`.
- `user-followers`: las listas de seguidores y seguidos y sus contadores excluyen las cuentas desactivadas.
- `users`: `GET /users/search` escapa `\`, `%` y `_`, así que la búsqueda es literal.
- `users`: `GET /users/:username/lists/:listId` compara el dueño de la lista con `:username`.
- `list-followers`: `GET /users/:username/following-lists` filtra los follows ocultos en la consulta; el `total` ya no los cuenta.

## Changed

- `lists`: `GET /lists/:id`, `/lists/recent`, `/lists/official`, `/lists/search`, `GET /games/:id/lists` y `POST /lists/:listId/duplicate` aplican la regla de visibilidad. Una lista pública oculta por el perfil o la sección responde 404.
- `list-followers`: `GET /lists/:listId/followers`, `POST /lists/:listId/follow`, `GET /lists/following` y `following-lists` aplican la misma regla; seguir una lista no salta la visibilidad, tampoco para el propio seguidor.
- `users`: `GET /users/:username/lists/:listId` responde 404 `LIST_NOT_FOUND` en lugar de `USER_NOT_FOUND`; `USER_NOT_FOUND` queda solo para el usuario inexistente.
- `docs/invariants.md`: secciones de privacidad y de listas.
- Colección Bruno: `games`, `lists`, `list-followers`, `users`, `user-followers` y `activity/get-feed.yml`.

## Files of interest

- `apps/api/src/users/helpers/visibility.helper.ts` (`canViewList`, `visibleListsCondition`)
- `apps/api/src/lists/lists.service.ts`
- `apps/api/src/list-followers/list-followers.service.ts`
- `apps/api/src/backlog/backlog.service.ts` (`findFriendsActivityForGame`, `findRandomPlayersForGame`)
- `apps/api/src/user-followers/user-followers.service.ts`
- `apps/api/src/activity/activity.service.ts`
- `apps/api/test/lists/lists-visibility.integration.test.ts`, `apps/api/test/activity/activity-feed.integration.test.ts`

## Commits

- `8ee3aa7f` — fix(user-followers): exclude deactivated accounts from followers, following and counts
- `b7406da7` — fix(games): respect mutual follows and active accounts in friends activity and players
- `af5e2bf0` — fix(users): scope list detail to its owner and filter hidden followed lists in the query
- `e38f5704` — fix(users): escape like wildcards in user search
- `695cb3e7` — docs(invariants): document social privacy fixes
- `de381cc8` — fix(lists): apply profile, lists section and isPublic visibility to lists of other users
- `0545b71a` — fix(list-followers): apply list visibility to followers, follow and followed lists
- `2a16dc5e` — test(lists): cover list visibility matrix and LIST_NOT_FOUND on user list detail
- `fe19ce76` — test(list-followers): cover list visibility on followers, follow and followed lists
- `5f8f87a2` — docs(api): document list visibility in lists, list-followers, users and games endpoints
- `9ef24ba9` — docs(invariants): document list visibility rule and LIST_NOT_FOUND
- `ed8c3f11` — fix(activity): show friends-only feed activities to mutual followers
