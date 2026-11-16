# AI recap bloqueado sin generaciones en el Rewind

**Released:** 2026-11-16

## Summary

Con acceso premium pero sin tiradas ni día extra, la primera generación de un Rewind dejaba "Write my AI recap" encendido y la API creaba el Rewind sin recap y sin avisar. Ahora la lista de años dice, por cada año sin generar, si la primera generación puede escribir el recap (`canWriteAiRecap`), con la misma regla de presupuesto que la generación. El diálogo apaga y bloquea el interruptor con la razón debajo, y la API rechaza `writeAiRecap: true` sin tiradas con 409 en vez de crear el Rewind sin recap. Además, generar ya no muestra el toast global de los 409, que duplicaba la alerta del diálogo y en móvil tapaba el botón "Generate".

## Highlights

- `canWriteAiRecap` en cada año de `GET /users/:username/rewinds`, solo `true` para el dueño en un año sin generar con tirada o día extra.
- Una primera generación con acceso, sin tiradas y con `writeAiRecap: true` responde 409 `REWIND_REGENERATION_LIMIT` y no crea nada.
- "Write my AI recap" queda apagado y deshabilitado con "No AI generations left for {year}…", también si la API responde ese 409 con datos viejos.
- Los 409 de la generación se explican solo en el diálogo; con el diálogo cerrado, el flujo avisa con `toast.warning` y el motivo de la API.

## Added

- `resolveFirstGenerationAiBudget` (`rewind/utils/resolve-first-generation-ai-budget.util.ts`): el presupuesto de IA de un año sin fila, compartido por `planRewindGeneration` y `buildRewindYears`.
- `canWriteAiRecap` en `RewindYearSummary` (API y web). `false` para años generados, sin acceso y para visitantes.
- Web: input `canWriteAiRecap` en `RewindGenerateDialog`, que pasan `rewind-year-card`, `profile-rewind-spotlight` y `rewind-detail`.

## Changed

- `creationBudget` (`rewind/services/rewind-reservation.service.ts`) lanza `regenerationLimitError` cuando `writeAiRecap` es `true`, hay acceso y el presupuesto no tiene gasto. Sin acceso, `writeAiRecap` se sigue ignorando.
- `RewindGenerateDialog`: `writeAiRecap` pasa a ser un `linkedSignal` que se apaga cuando no quedan generaciones; el error `limit` no bloquea una primera generación y su mensaje dice que el recap se apagó.
- `RewindService.generate` manda `SUPPRESS_CONFLICT_TOAST`. `injectRewindGenerateFlow` ya no recarga el Rewind tras un `limit` en una primera generación, porque no existe.
- `docs/api/rewind/` y `docs/rules.md` documentan el campo, el 409 y la supresión del toast.

## Migration

- La API y la web salen juntas: una web anterior que mande `writeAiRecap: true` sin tiradas recibe 409 en vez de un Rewind sin recap.

## Files of interest

- `apps/api/src/rewind/utils/resolve-first-generation-ai-budget.util.ts`
- `apps/api/src/rewind/utils/build-rewind-years.util.ts`
- `apps/api/src/rewind/services/rewind-reservation.service.ts`
- `apps/web/src/app/features/rewind/components/rewind-generate-dialog/rewind-generate-dialog.ts`
- `apps/web/src/app/features/rewind/components/rewind-generate-dialog/rewind-generate-flow.ts`

## Commits

- `ef02b31b` — test(rewind): align recap tests with the optional ai recap contract
- `8c897b7d` — feat(rewind): tell which years can still write the ai recap and refuse it without generations left
- `49d025a1` — feat(web): lock the ai recap switch when the year has no ai generations left
- `6103bbf1` — fix(web): keep the conflict toast from covering the rewind generate dialog
- `7dc4d24f` — docs(api): document canWriteAiRecap and the 409 without ai generations left
- `80506fc4` — docs(rules): document the locked ai recap switch and the suppressed generate conflict toast
