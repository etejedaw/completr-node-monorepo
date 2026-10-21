# Correcciones de privacidad en la API

**Released:** 2026-10-21

## Summary

Correcciones de fugas de datos entre usuarios encontradas por los tests de integración y los recorridos. Las respuestas públicas dejan de exponer notas, mood tags, entradas privadas y listas privadas, y el endpoint de miembros coop exige pertenecer al run.

## Highlights

- `GET /users/me/mood-tags` ya no devuelve tags de otros usuarios.
- La queue pública oculta las notas, los mood tags y las entradas de backlogs privados, y numera las posiciones sobre lo visible.
- Los seguidores de una lista privada y las listas seguidas que pasaron a privadas dejan de ser visibles para terceros.

## Fixed

- `mood-tags`: `findTagsByUser` filtra por usuario en cada lado del `FULL OUTER JOIN`; antes aparecían los `MoodTagMetas` de otros usuarios.
- `queue`: `GET /users/:username/queue` usa `publicQueueSerializer`, sin `backlog.notes` ni `moodTags`, excluye las entradas con `Backlog.isPublic = false` en la consulta y numera `position` como `offset + índice + 1`.
- `coop-runs`: `GET /users/me/backlog/:backlogId/coop` responde 403 `COOP_FORBIDDEN` a quien no es dueño ni miembro del run, y 404 si la partida no existe; etiquetar dos veces al mismo usuario responde 422 `COOP_ALREADY_TAGGED`.
- `list-followers`: `GET /lists/:listId/followers` responde 404 `LIST_FOLLOWER_LIST_NOT_FOUND` si la lista es privada y quien pide no es su dueño.
- `list-followers`: `GET /users/:username/following-lists` excluye las listas privadas que no pertenecen a quien mira.

## Changed

- `docs/invariants.md`: reglas de la queue pública y de los seguidores de listas.
- Colección Bruno: `queue/get-user.yml`, `coop-runs` y `list-followers/get-followers.yml`.

## Files of interest

- `apps/api/src/mood-tags/mood-tags.service.ts`
- `apps/api/src/queue/queue.controller.ts`, `apps/api/src/queue/queue.serializer.ts`
- `apps/api/src/coop-runs/coop-runs.service.ts`
- `apps/api/src/list-followers/list-followers.service.ts`

## Commits

- `96b8366a` — fix(mood-tags): scope tag metadata to the caller when listing tags
- `c05eca20` — fix(queue): hide backlog notes in the public queue
- `3fbaf52f` — fix(coop-runs): reject duplicate tags and members listing by outsiders
- `b4844000` — fix(queue): hide private backlogs and mood tags from the public queue
- `44c84dad` — test(queue): cover public queue privacy and visible positions
- `87b8125d` — docs(queue): document public queue privacy rules
- `86e413b5` — fix(list-followers): hide private list followers and followed lists from third parties
- `79d60cea` — test(list-followers): cover private list followers and profile followed lists
- `27b1c186` — docs(api): document private list handling in get list followers
- `50e1b368` — docs(invariants): document list followers privacy rules
