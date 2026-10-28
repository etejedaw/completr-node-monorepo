# Padre de DLC y etiquetas de variante

**Released:** 2026-10-27

## Summary

Dos huecos en la consistencia del catálogo se cierran en la API y en el editor de juegos. Primero, un DLC mal vinculado no se podía desvincular desde la herramienta: `PATCH /games/:id` no aceptaba `parentGameId: null`, y un juego que dejaba de ser DLC conservaba su padre. Como un juego con DLCs no se puede borrar en duro, el padre equivocado tampoco se podía borrar. Segundo, Split aceptaba etiquetas de variante repetidas o en blanco, aunque la etiqueta es lo único que distingue a variantes que comparten external id.

## Highlights

- `PATCH /games/:id` desvincula un DLC con `parentGameId: null`, y con `isDlc: false` limpia el padre siempre.
- Un juego no puede ser su propio padre.
- `POST /games/:id/split` rechaza etiquetas repetidas (sin distinguir mayúsculas ni espacios) o en blanco, y guarda títulos y etiquetas recortados.

## Added

- `parentGameId` nullable en `UpdateGameSchema`.
- `updateGame` rechaza `parentGameId` igual al propio juego con 400 `GAME_VALIDATION_ERROR`.
- Validación de etiquetas en `assertSplitVariantsValid`, con 400 `GAME_SPLIT_INVALID`.
- Editor de juegos:
    - Quitar el padre de un DLC y guardar manda `parentGameId: null`. Solo pasa cuando el admin lo quita a propósito (`parentCleared`), nunca porque falte el dato.
    - Buscar como padre el slug del propio juego muestra "A game can't be its own parent." sin pedir nada al servidor.
    - Split rechaza etiquetas repetidas con "Variant labels must be unique.".

## Changed

- `updateGame` pone `parentGameId` en `null` cuando el body trae `isDlc: false`.
- `splitGame` recorta títulos y etiquetas antes de validar y guardar.
- `UpdateGameDto` del frontend admite `parentGameId: null`.
- `docs/invariants.md` y la colección Bruno (`docs/api/games/update.yml`, `docs/api/games/split.yml`) documentan las reglas nuevas.

## Files of interest

- `apps/api/src/games/games.service.ts`
- `apps/api/src/games/services/games-variant.service.ts`
- `apps/web/src/app/features/games/admin-game-editor/admin-game-editor.ts`

## Commits

- `b55a5300` — feat(api): unlink dlc parents and clear them when a game stops being a dlc
- `fb088a53` — fix(api): reject repeated or blank split variant labels and trim split input
- `b1e04d15` — test(api): cover dlc parent unlinking and split label rules
- `356cb1f1` — docs(api): document dlc parent unlinking and split label rules
- `e79a4ff7` — feat(web): unlink dlc parents from the game editor and reject repeated split labels
