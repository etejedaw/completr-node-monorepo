# Un solo botón de IA en el panel del Rewind

**Released:** 2026-11-16

## Summary

El panel del dueño mostraba "Add AI recap" y "Regenerate" a la vez cuando el Rewind todavía no tenía recap, aunque los dos gastan la misma tirada y escriben el recap. Ahora hay un solo botón que siempre abre el diálogo de regenerar: dice "Add AI recap" sin recap, "Retry" cuando el recap falló y "Regenerate" en el resto. Abierto desde "Add AI recap" en un Rewind sin premium stats, el diálogo avisa que también se agregan. La web deja de usar `POST /users/me/rewinds/:year/ai-recap` y se elimina el diálogo propio del recap.

## Highlights

- Un solo botón de IA en la zona premium del panel, con la etiqueta según `aiRecapState`.
- "Add AI recap" y "Retry" abren el mismo diálogo que "Regenerate" y mandan `POST /users/me/rewinds/:year`.
- "Your premium stats will be added to this Rewind too." aparece en el diálogo solo al agregar el recap a un Rewind sin premium stats.

## Changed

- `RewindOwnerPanel`: `aiAction` elige etiqueta e ícono (`auto_awesome` para "Add AI recap", `refresh` para el resto); sin tiradas el mismo botón queda deshabilitado con la razón debajo. `addsPremiumStats` se pasa al diálogo de generación.
- `RewindGenerateDialog`: input `addsPremiumStats`, que muestra el aviso de premium stats.
- `docs/rules.md` describe el botón único.

## Removed

- `rewind-ai-recap-dialog` (componente y spec).
- `RewindService.addAiRecap`, `AddRewindAiRecapRequest`, `rewindAiRecapError` y su tipo, y los textos `aiRecapPending` y `aiRecapErrors` del panel. Los errores de agregar el recap ahora los explica el diálogo de generación.

## Files of interest

- `apps/web/src/app/features/rewind/components/rewind-owner-panel/rewind-owner-panel.ts`
- `apps/web/src/app/features/rewind/components/rewind-owner-panel/rewind-owner-panel.html`
- `apps/web/src/app/features/rewind/components/rewind-generate-dialog/rewind-generate-dialog.html`

## Commits

- `1461787d` — feat(web): merge add ai recap, retry and regenerate into a single rewind ai button
- `af1d1159` — docs(rules): document the single rewind ai button
