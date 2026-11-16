# Agregar el AI recap es una regeneración

**Released:** 2026-11-16

## Summary

Con el botón único del panel, "Add AI recap" y "Retry" ya abrían el diálogo de regenerar, así que el endpoint propio para agregar el recap quedó sin uso. Se elimina `POST /users/me/rewinds/:year/ai-recap` con su schema, su reserva y los errores que solo lanzaba ese camino. Agregar, reintentar o rehacer el recap pasa siempre por `POST /users/me/rewinds/:year`. En la web, el diálogo abierto desde "Add AI recap" se titula "Add an AI recap to your {year} Rewind" y su botón dice "Add AI recap".

## Highlights

- Una sola ruta escribe el recap: la generación y la regeneración.
- El diálogo de regenerar tiene un modo "Add AI recap" con título, ícono, aviso y botón propios.

## Changed

- `RewindGenerateDialog`: input `addsAiRecap`; con él, `heading`, `subheading`, `icon`, `replaceWarning` y `submitLabel` cuentan que se agrega el recap. `RewindOwnerPanel` lo pasa cuando `aiRecapState` es `available`.
- Tests de integración del Rewind: `requestAiRecap` se reemplaza por `regenerateStored`, que regenera con el `generatedAt` guardado. Siguen probando el gasto, la devolución, el cupo del regalo y del premium, las notas y el doble clic, este último como dos regeneraciones con el mismo `generatedAt` (una gana y la otra recibe 409 `REWIND_GENERATION_CONFLICT`).
- `docs/rules.md` describe el modo "Add AI recap" y el límite de ráfagas de la única ruta de generación.

## Removed

- `POST /users/me/rewinds/:year/ai-recap`: ruta, `postOwnRewindAiRecap`, `addOwnRewindAiRecap`, `reserveAiRecap`, `requireAiRecapAllowed`, `AddRewindAiRecapSchema` y su DTO, `RewindAiRecapReservation` y `SpendableRewindAiBudget`.
- Errores `REWIND_AI_RECAP_EXISTS`, `REWIND_AI_RECAP_IN_PROGRESS` y `REWIND_AI_RECAP_FAILED` en sus tres capas.
- `docs/api/rewind/add-own-rewind-ai-recap.yml`.

## Migration

- Un cliente que llame a `/ai-recap` recibe 404: debe regenerar con `expectedGeneratedAt` igual al `generatedAt` guardado.

## Files of interest

- `apps/api/src/rewind/services/rewind-reservation.service.ts`
- `apps/api/test/rewind/rewind-generation.helper.ts`
- `apps/web/src/app/features/rewind/components/rewind-generate-dialog/rewind-generate-dialog.ts`

## Commits

- `3f7fd742` — feat(web): title the regenerate dialog as add ai recap when the rewind has no recap yet
- `9fe677ce` — refactor(rewind): remove the ai-recap endpoint now that adding the recap is a regeneration
- `8c2c276c` — docs(rules): describe the add ai recap dialog and the single generation route
