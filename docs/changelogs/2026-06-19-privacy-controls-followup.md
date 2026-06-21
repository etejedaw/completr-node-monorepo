# Privacy controls follow-up: clean up isPublic leftovers in users service

**Released:** 2026-06-19

## Summary

Fix de follow-up de la refactor de privacidad documentada en `2026-06-19-privacy-controls.md`. Tres queries en `users.service.ts` (`searchUsers`, `findUserByExactEmail`, `findRandomPublicUsers`) seguian referenciando la columna `isPublic`, que ya no existe en la DB despues de la migracion `20260619160000-add-visibility-enums.js`. Eso causaba 500 al hacer search/discover/lookup de usuarios. Se reemplazan por `profileVisibility` (atributo) o por el predicado `profileVisibility = 'public'` cuando se filtra "publicos para discover".

## Fixed

- `users.service.searchUsers` ahora selecciona `profileVisibility` en lugar de `isPublic`.
- `users.service.findUserByExactEmail` idem.
- `users.service.findRandomPublicUsers` cambia el `where` de `isPublic: true` a `profileVisibility: "public"` y ajusta los atributos seleccionados.

## Files of interest

- `src/users/users.service.ts`

## Commits

- `daa86ed` — fix(users): replace leftover isPublic with profileVisibility in queries
