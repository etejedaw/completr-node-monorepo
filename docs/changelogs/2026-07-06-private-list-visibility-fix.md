# Fix de visibilidad de listas privadas

**Released:** 2026-07-06

## Summary

Se corrigió una inconsistencia de privacidad en el detalle de listas. El endpoint directo `GET /lists/:id` no tenía verificación de visibilidad: cualquier usuario autenticado podía leer el contenido completo de una lista privada ajena por su id. En paralelo, el endpoint con scope de usuario `GET /users/:username/lists/:id` lanzaba `404` para el propio dueño cuando su lista era privada, porque solo consideraba `isPublic` sin contemplar al owner.

Ambos endpoints ahora aplican la misma regla: una lista es visible si es **pública o el viewer es su dueño**. Esto cierra el filtrado de listas privadas a terceros y permite al dueño ver su propia lista privada desde el contexto del perfil (que redirige con `?from=`).

## Fixed

- `GET /lists/:id` ahora rechaza (`404 LIST_NOT_FOUND`) una lista privada si el viewer no es el dueño.
- `GET /users/:username/lists/:id` ahora sí devuelve la lista privada del propio dueño.

## Files of interest

- `src/lists/lists.controller.ts` — `getListById`.
- `src/users/users-profile.service.ts` — `getListDetailForUsername`.

## Commits

- `496c064` — fix(lists): restrict private list detail to its owner on both endpoints
