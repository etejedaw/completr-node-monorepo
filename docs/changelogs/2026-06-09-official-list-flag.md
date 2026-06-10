# Flag `isOfficial` en serializers de listas

**Released:** 2026-06-09

## Summary

Expone el flag `isOfficial` desde los serializers de `lists`. El frontend lo usa para renderizar un badge visual en las listas curadas por la cuenta oficial de Completr. La data ya existía en el modelo — el cambio es de capa de serialización.

## Added

- **`isOfficial` en list serializers:** disponible en list detail y en list summaries.

## Files of interest

- `src/lists/lists.serializer.ts`.

## Commits

- `722c2d9` — feat(lists): expose isOfficial flag in list serializers
