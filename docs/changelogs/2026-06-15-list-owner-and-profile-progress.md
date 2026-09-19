# Dueño y progreso de listas desde un perfil

**Released:** 2026-06-15

## Summary

Al abrir una lista desde el perfil de otro usuario, la vista atribuía la lista al perfil de origen y calculaba el progreso con el backlog del viewer. Ahora la lista muestra a su dueño real, y el progreso es el del usuario del perfil, respetando la privacidad de su backlog.

## Changed

- `GET /users/:username/lists/:listId` calcula el progreso y el resumen por juego con el backlog del usuario del perfil. Solo se calcula si el viewer es el dueño o el backlog del perfil es público; para terceros solo cuentan entries públicas (`publicOnly` en `getBacklogSummaryMap` y `getListProgress`).
- `lists-detail` en el frontend pide la lista con el usuario del perfil cuando llega desde uno y muestra ese progreso.

## Fixed

- El serializer de `lists` expone al dueño de la lista, y `list-detail` lo usa en lugar del perfil del que se vino.

## Files of interest

- `apps/api/src/lists/lists.service.ts`
- `apps/api/src/users/` — handler `getUserListDetail`.
- `apps/web/src/app/features/lists/list-detail/list-detail.ts`
- `docs/api/users/get-user-list-detail.yml`

## Commits

### Backend

- `e70bb5d9` — fix(lists): expose list owner in serializer for correct attribution
- `8fbfb8f9` — feat(lists): view a list with the profile user's progress, respecting backlog privacy
- `1166e74c` — docs(api): update list detail docs for profile-user progress and owner field

### Frontend

- `02da3ae2` — fix(lists): show real list owner instead of the profile you came from
- `fa789a10` — feat(lists): show the profile user's progress when opening a list from their profile
- `7d4b15fc` — refactor(lists): drop explanatory comment from getByIdForUser
