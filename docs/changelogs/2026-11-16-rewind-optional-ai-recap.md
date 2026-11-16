# AI recap opcional y límite diario de IA en el Rewind

**Released:** 2026-11-16

## Summary

La primera generación de un Rewind con acceso premium escribía el AI recap sin preguntar, y "Add AI recap" lo pedía con un solo clic y con las opciones de privacidad por defecto. Ahora el diálogo de generación tiene el interruptor "Write my AI recap", y "Add AI recap" abre su propio diálogo con el aviso del proveedor y los interruptores de privacidad. Las premium stats se guardan al generar aunque no haya recap. El límite diario cuenta recaps con IA, no peticiones: 2 por usuario al día, consumidos solo cuando la petición gasta una tirada o la gracia.

## Highlights

- Un premium puede generar su Rewind sin recap y sin gastar nada; las premium stats se guardan igual.
- "Add AI recap" pide confirmación y deja elegir "Include private runs" y "Use my notes" antes de llamar a la IA.
- Sin tiradas, "Regenerate" queda visible y deshabilitado, con la razón en una línea debajo.
- 2 recaps con IA por usuario al día (`REWIND_AI_RECAP_DAILY_LIMIT`, 429).

## Added

- `writeAiRecap` en `GenerateRewindSchema`. Solo tiene efecto en la primera generación; una regeneración siempre escribe el recap.
- `AddRewindAiRecapSchema` (`includePrivateRuns`, `includeNotes`) como body obligatorio de `POST /users/me/rewinds/:year/ai-recap`. Las opciones se guardan en el Rewind y las premium stats se recalculan con ellas.
- `storePremiumStats` en `rewind/services/rewind-ai-recap.service.ts`: guarda las premium stats de una primera generación con acceso y sin recap.
- `rewindAiRecapDailyLimiter`, `consumeAiRecapDailyQuota` y el error `REWIND_AI_RECAP_DAILY_LIMIT` (429). El punto se consume dentro de la transacción de reserva; si el límite rechaza, la transacción se revierte sin gastar nada. Admins y moderadores quedan exentos.
- `isRateLimitingActive` e `isRateLimitExempt` en `rate-limiter.middleware.ts`, compartidos por el middleware y el límite diario.
- Web: `rewind-ai-provider-notice` (aviso de DeepSeek, en un solo lugar), `rewind-ai-recap-switches` y `rewind-ai-recap-dialog`.
- Web: el error `daily_limit` en `rewind-errors.ts`, con su mensaje en el diálogo de generación y en el panel del dueño.

## Changed

- `rewindGenerationLimiter` vuelve a 5 peticiones cada 10 minutos, ahora por usuario, compartido entre las dos rutas de generación.
- Una primera generación con acceso fija `premiumAccessKind` y el cupo de tiradas aunque no use la IA, para que el distintivo de las premium stats sea correcto y el cupo se asigne una sola vez.
- `RewindService.addAiRecap(year, request)` manda el body. "Add AI recap" y "Retry" del panel abren el diálogo en vez de llamar a la API.
- El texto de "Add AI recap" en el panel ya no menciona el gasto: "Adds an AI-written recap to this Rewind.".
- `docs/api/rewind/` y `docs/rules.md` documentan el recap opcional, el diálogo y el límite diario.

## Migration

- La API y la web salen juntas: una web anterior no manda `writeAiRecap` ni el body de `ai-recap`, y la API responde 422 `COMMON_SCHEMA_INVALID`.

## Files of interest

- `apps/api/src/rewind/services/rewind-reservation.service.ts`
- `apps/api/src/rewind/services/rewind-ai-recap.service.ts`
- `apps/api/src/rewind/utils/consume-ai-recap-daily-quota.util.ts`
- `apps/web/src/app/features/rewind/components/rewind-ai-recap-dialog/`
- `apps/web/src/app/features/rewind/components/rewind-generate-dialog/rewind-generate-dialog.ts`
- `apps/web/src/app/features/rewind/components/rewind-owner-panel/rewind-owner-panel.html`

## Commits

- `ea586f67` — feat(rewind): limit ai recaps to two per user per day and keep a per user burst limit
- `5aa044c9` — feat(rewind): make the ai recap optional on first generation and take its privacy options when added later
- `4df11bd2` — feat(web): add a write ai recap switch to the rewind generation dialog
- `615ac5e4` — feat(web): confirm the ai recap in a dialog and keep regenerate visible when no generations are left
- `68febf34` — feat(web): explain the daily ai recap limit
- `e76747d1` — docs(api): document the optional ai recap, its privacy options and the daily limit
- `c75cb22a` — docs(rules): document the optional ai recap, the recap dialog and the daily ai limit
