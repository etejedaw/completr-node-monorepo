# Límites al gasto de IA del Rewind

**Released:** 2026-11-16

## Summary

Un recap con IA fallido devolvía siempre la tirada o el día extra, aunque el modelo ya hubiera respondido y cobrado los tokens. Como las notas y reseñas del dueño entran al prompt, se podía provocar el fallo a propósito y regenerar sin límite. Ahora solo se devuelve lo gastado cuando el fallo no consumió tokens. Además, las dos rutas de generación se limitan por usuario y por día, en vez de por IP.

## Highlights

- Un fallo con salida inválida, respuesta vacía o fuera de plazo deja la tirada gastada.
- Generar un Rewind admite 2 peticiones por usuario cada 24 horas, cambie o no la IP.

## Changed

- `runRecap` (`rewind/services/rewind-ai-recap.service.ts`) solo llama a `refundAiSpend` si el código del error no está en `REWIND_AI_TOKEN_SPENDING_ERROR_CODES` (`IA_INVALID_OUTPUT`, `IA_INVALID_RESPONSE`, `IA_TIMEOUT`). Un proveedor caído, la IA sin configurar o un error antes de llamarla siguen devolviendo el gasto. El log de `runRecap failed` incluye `refunded`.
- `rewindGenerationLimiter` pasa de 5 peticiones cada 10 minutos a `REWIND_GENERATIONS_PER_DAY` (2) cada 24 horas, compartido entre `POST /users/me/rewinds/:year` y `POST /users/me/rewinds/:year/ai-recap`.
- `rateLimiterMiddleware` recibe una función opcional para la clave; por defecto sigue usando `resolveClientIp`. Las rutas de generación del Rewind usan `resolveUserRateLimitKey`, que toma el id del usuario autenticado.
- `docs/rules.md` documenta cuándo se devuelve el gasto de IA y por qué la generación se limita por usuario.

## Files of interest

- `apps/api/src/rewind/services/rewind-ai-recap.service.ts`
- `apps/api/src/rewind/rewind-rate-limiter.config.ts`
- `apps/api/src/common/middlewares/rate-limiter.middleware.ts`
- `apps/api/src/rewind/rewind.routes.ts`

## Commits

- `d8814ffa` — fix(rewind): keep the AI generation spent when the provider already consumed tokens
- `751ab0f7` — fix(rewind): limit rewind generations to two per user per day
- `29070ec9` — docs(rules): document the rewind AI refund and per user generation limit
