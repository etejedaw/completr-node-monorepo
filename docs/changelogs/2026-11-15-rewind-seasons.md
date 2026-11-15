# Temporadas del Rewind: ediciones, generaciones con IA y congelado

**Released:** 2026-11-15

## Summary

El Rewind deja de tener un calendario fijo en código (`REWIND_OPENING_MONTH`, `REWIND_SPOTLIGHT_LAST_MONTH`, `REWIND_GRACE_LAST_DAY`) y un límite global de regeneraciones (`REWIND_REGENERATION_LIMIT`). Pasa a funcionar por ediciones anuales que se configuran desde Admin → Rewind: periodo de apertura y cierre, ventana de gracia, diseño y cupos de generaciones con IA para premium completo y para el regalo de `rewind.premium`, con fechas en días UTC. Solo dentro del periodo se puede generar o regenerar; los años anteriores quedan para premium completo. Cada generación con IA gasta una tirada de `Rewinds.regenerationsLeft`, que reemplaza a `regenerationsUsed`. Al cerrar el periodo, un programador dentro de la API congela cada Rewind en dos fotos, la del dueño y la de un visitante, que se muestran con el diseño de su edición aunque después cambien los datos o la privacidad de una run. En la web, el Rewind se dibuja a través de un registro de diseños, el panel del dueño pasa a una fila de chips de estado y Admin gana la página de ediciones y tiradas.

## Highlights

- Ediciones configurables en `RewindEditions`, con `GET/POST/PUT /admin/rewind/editions`, aviso al editar una edición en curso y opción de aplicar el cambio de cupo a los Rewinds ya generados.
- Tiradas por Rewind: la primera generación con IA también gasta una, la gracia da una extra sin gastar y una IA que falla devuelve lo gastado. El cupo de la edición se suma a las tiradas que el admin haya dado antes.
- Congelado automático con `croner` y advisory lock de Postgres, más un job manual (`POST /admin/jobs/rewind-freeze`) y congelado al leer como respaldo.
- La API manda el estado del periodo (`period`, `periodStatus`) y el motivo de bloqueo por año y por regeneración, para que la web no calcule fechas en el cliente.

## Added

- Módulo `rewind-editions`: modelo `RewindEdition`, servicio con la edición vigente, la última abierta, la próxima y las cerradas sin congelar, y su API de admin con validación de fechas (`opensAt <= graceStartsAt <= graceEndsAt <= closesAt`), solapamiento (`REWIND_EDITION_OVERLAP`), año repetido (`REWIND_EDITION_EXISTS`), edición congelada (`REWIND_EDITION_FROZEN`) y `REWIND_EDITION_INVALID`. Las escrituras se serializan con `pg_advisory_xact_lock`.
- Reglas del Rewind en `rewind/utils/`: `resolveRewindAiBudget` (cupo, gracia y gasto), `planRewindGeneration`, `resolveRewindAiUseChanges`, `isRewindYearAllowed`, `resolveRewindGenerationBlocker`, `resolveRewindRegenerationBlocker` y `resolveRewindPeriod`. Errores nuevos: `REWIND_PERIOD_CLOSED` (409) y `REWIND_YEAR_REQUIRES_PREMIUM` (403).
- Congelado: `rewind/services/rewind-freeze.service.ts` arma `RewindSnapshot` (`owner` y `public`) fuera de cualquier transacción, bloquea la fila, compara `updatedAt` y escribe; si la fila cambió, reintenta una vez. `runWithRewindFreezeLock` toma un advisory lock de sesión en una conexión dedicada. `jobs/rewind-freeze.scheduler.ts` corre al arrancar y cada 10 minutos, y `app.ts` lo detiene con `SIGTERM` y `SIGINT`.
- La foto guarda la persona calculada con y sin platinos (`personaWithoutPlatinums`) y las portadas, así la lista de años y la imagen para compartir salen de la misma foto.
- `GET /admin/rewinds` (paginado con `limit` y `offset`, filtro `search`) y `PATCH /admin/rewinds/:rewindId` con `{ regenerationsLeft }`. Cada item trae `aiAccess` y el PATCH responde `REWIND_NO_AI_ACCESS` (409) si el dueño no tiene acceso a la IA.
- `rewind-share`: las plantillas se eligen por `design` (`share-designs.template.ts`); un diseño desconocido cae al último de `REWIND_DESIGNS`.
- Web: Admin → Rewind (`features/admin/admin-rewind`) con ediciones, diálogo de edición, confirmación con `applyToGenerated`, resumen de edición congelada y tabla de Rewinds con edición en línea de las tiradas.
- Web: `ui-date-range-picker`, sobre `NgpDateRangePicker`, comparte con `ui-date-picker` el panel de calendario (`ui-calendar-panel`) y la lógica de apertura (`injectCalendarOpening`).
- Web: registro de diseños (`rewind-designs.ts`, `rewind-design-outlet`) con `rewind-design-2026`, que contiene lo que antes dibujaba `rewind-detail`.

## Changed

- `ownerControls` agrega `periodOpen`, `periodStatus`, `closesAt`, `frozenAt` y `regenerationBlockedBy`; la respuesta `Rewind` agrega `design` y `frozenAt`. `GET /users/:username/rewinds` agrega `period` y `generationBlockedBy` por año.
- `premiumAccessKind` se fija la primera vez que el Rewind usa la IA, junto con su cupo, y ya no vuelve a `null`.
- Panel del dueño: una fila de chips de estado (temporada, generaciones con IA en dorado con el distintivo Premium o Regalo, gracia, idioma, runs y notas) con "Regenerar" al final. Sin acceso a la IA no muestra nada que mencione Premium.
- Diálogo de generar, tarjetas del archivo, spotlight del perfil y página "no generado" usan el motivo que manda la API; sin acceso no hay regeneración.
- Exportación de datos personales: `regenerationsLeft` y `frozenAt` en lugar de `regenerationsUsed`.
- Help explica temporada, generaciones con IA, gracia y congelado sin fechas fijas.
- `docs/rules.md`: gasto y devolución de tiradas, concurrencia del congelado, las dos fotos y por qué no se reevalúa la privacidad de cada run, persona con y sin platinos, la excepción del programador a la regla de una sola instancia y la suma del cupo.

## Removed

- `REWIND_REGENERATION_LIMIT`, `REWIND_OPENING_MONTH`, `REWIND_SPOTLIGHT_LAST_MONTH`, `REWIND_GRACE_LAST_DAY` y `resolve-grace-ends-at.util.ts`.

## Migration

- `20261115005919-replace-regenerationsused-with-regenerationsleft-in-rewinds.js`: quita `regenerationsUsed` y agrega `regenerationsLeft` (`CHECK >= 0`). Las filas existentes quedan en 0.
- `20261115005921-add-snapshot-and-frozenat-to-rewinds.js`: `snapshot` (JSONB) y `frozenAt`.
- `20261115005922-create-rewindeditions-table.js`: tabla `RewindEditions` con sus `CHECK` y la edición 2026 (2026-12-01 a 2027-01-31, gracia del 1 al 7 de enero, diseño `2026`, cupos en 0).
- Nueva dependencia de la API: `croner`.

## Files of interest

- `apps/api/src/rewind-editions/rewind-editions.service.ts`
- `apps/api/src/rewind/utils/resolve-rewind-ai-budget.util.ts`
- `apps/api/src/rewind/services/rewind-freeze.service.ts`
- `apps/api/src/jobs/rewind-freeze.scheduler.ts`
- `apps/web/src/app/features/admin/admin-rewind/admin-rewind.ts`
- `apps/web/src/app/features/rewind/components/rewind-owner-panel/rewind-owner-panel.html`
- `apps/web/src/app/shared/ui/date-picker/ui-date-range-picker.ts`

## Commits

- `a93e5f20` — test(rewind): read the owner panel chips by their accessible text
- `e741e541` — feat(rewind): show the owner panel as a row of status chips
- `f502010b` — docs(rules): document why the edition quota adds up and admin rolls need ai access
- `c359a702` — docs(api): document ai access in the rewind admin endpoints
- `f7070574` — test(admin): cover ai access in the rewind admin table
- `7b1896ab` — feat(admin): hide the ai generations editor for owners without ai access
- `fd6520d6` — test(rewind): cover admin ai access checks and the added edition quota
- `57b072f2` — feat(rewind): only let admins give ai generations to owners with ai access
- `6a2d1e9a` — fix(rewind): add the edition quota to the rolls a rewind already has
- `d68534b7` — feat(rewind): lay out the owner panel as a content-sized strip for two or three blocks
- `a6efeb83` — test(rewind): check the owner panel never hints at premium without ai access
- `4d979893` — fix(rewind): hide the ai generations tile from owners without ai access
- `a3c9a707` — test(rewind): cover the owner panel tiles, language and premium ribbon
- `8358eb8a` — feat(rewind): redesign the owner panel as season, premium ai generations and version tiles
- `e9c6359a` — docs(web): document the date range picker and its test helper
- `b1b4d146` — docs(help): explain rewind seasons, ai generations and freezing without fixed dates
- `95ea8aae` — feat(admin): add rewind admin page for editions and ai generations left
- `e8a03db3` — refactor(rewind): draw rewinds through a design registry with the 2026 design
- `9f6fceef` — feat(rewind): show edition periods, ai generations and block reasons from the api
- `03558b16` — feat(ui): add date range picker sharing the calendar panel and opening logic
- `22af4f8d` — refactor(rewind): hold the freeze lock on a dedicated connection, split owner and public views and reuse one clock
- `a9eee871` — feat(api): stop the rewind freeze scheduler on SIGTERM and SIGINT
- `eea8ccb5` — refactor(jobs): drop redundant catch and timezone from the rewind freeze scheduler
- `50ea6d4b` — refactor(jobs): share failure and rewind freeze report descriptions
- `f9b0dcea` — test(rewind): pass frozen views and generation access to rewind years builders
- `3f29cd63` — refactor(rewind): reuse the shared rewind day helper when freezing rewinds
- `4c4e477b` — docs(api): document rewind freezing and the rewind freeze job in Bruno collection
- `9d974ab1` — test(api): cover the manual rewind freeze job
- `db8eace6` — test(api): check rewind share images are drawn from the snapshot
- `24740a31` — test(api): cover rewind snapshots, freezing and frozen listing with erratic users
- `35b538a1` — feat(api): add rewind freeze job and scheduler on startup and every 10 minutes
- `7d8e3fa9` — feat(api): pick rewind share templates by design
- `8b810373` — feat(api): freeze rewinds into owner and visitor snapshots and read frozen years from them
- `1bbf0201` — feat(api): find closed unfrozen rewind editions and mark them frozen
- `651bbb20` — build(api): add croner for in-process scheduled jobs
- `f54cf135` — docs(rules): document rewind rolls, freezing snapshots and freeze locking
- `fb6df860` — docs(api): document admin edition status and regeneration blocker in Bruno collection
- `c9a6cc49` — feat(api): expose admin edition status and regeneration blocker in owner controls
- `ffa23b69` — docs(api): document rewind period, generation blockers and period status in Bruno collection
- `0eefa3b1` — feat(api): expose rewind period status and generation blockers per year
- `ae78a4f1` — docs(api): rename rewind admin search param and document edition invalid error
- `0ff09e28` — refactor(api): split rewind admin schemas and dtos and remove duplicated rewind helpers
- `d4f1c577` — docs(api): document rewind admin endpoints in Bruno collection
- `dd3559d2` — test(api): cover rewind admin endpoints with permissions, garbage input and concurrency
- `3f653b53` — feat(api): add admin endpoints for rewind editions and per-rewind regenerations
- `6a9ac3a9` — docs(api): document rewind editions, rolls and new errors in Bruno collection
- `07bf2196` — test(api): check rewind rolls left and freeze date in the personal data export
- `cf9c7de7` — test(api): cover rewind editions, rolls, grace and refunds with erratic users
- `9e631c08` — feat(api): export rewind rolls left and freeze date in personal data
- `c4361142` — feat(api): gate rewind generation by edition period and spend ai rolls per rewind
- `faf1fc1a` — feat(api): add rewind editions model and service
- `fb1c551a` — feat(api): add rewind editions table and per-rewind rolls, snapshot and freeze columns
