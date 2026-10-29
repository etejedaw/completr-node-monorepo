# Resumen IA del Rewind centrado en el perfil del jugador, con notas opt-in

**Released:** 2026-10-29

## Summary

El resumen con IA seguía contando el año en vez de describir al jugador, y repetía lo que ya muestran las estadísticas premium. Ahora su párrafo central es "cómo eres como jugador": entre 3 y 5 conclusiones sobre lo que valora, lo que lo hace abandonar, cómo juega y qué contradicciones tiene, cada una con su evidencia. Para eso la IA recibe datos que antes no tenía:

- **Notas:** solo si el dueño premium lo elige con el switch nuevo "Use my notes", apagado por defecto. Se guarda en la columna `includesNotes` de `Rewinds`.
- **Horas:** las reales y las estimadas por separado, para medir el ritmo frente a HowLongToBeat.
- **Datos por juego:** los días que esperó en el backlog y la saga de cada juego.
- **Patrones nuevos:** ritmo, sagas del año, juegos en paralelo frente a de a uno, y hábitos al calificar.

Las notas son privadas y el resumen lo leen los visitantes. Por eso el prompt prohíbe copiarlas textuales, nombrar a las personas que mencionan, tocar temas sensibles, atribuir a un juego un motivo que su propia nota no dice y generalizar a partir de una sola nota.

## Highlights

- `GenerateRewindRequest.includeNotes` (obligatorio) y `RewindOwnerControls.includesNotes`. Generar y regenerar lo guardan; `ai-recap` usa el valor guardado.
- Las notas se leen de la base solo con el opt-in y respetan `includesPrivateRuns`. Nunca aparecen en una respuesta HTTP.
- Columnas nuevas en la tabla de la IA: `realHours`, `estimatedHours`, `paceVsEstimate`, `daysInBacklog`, `franchise` y, con opt-in, `notes` (recortada a 300 caracteres). Patrones nuevos: `pace`, `franchises`, `overlap` y `ratingHabits`.
- El listón premium del resumen IA y de las estadísticas premium ahora explica la ventaja al presionarlo, en el idioma del Rewind (`UiPremiumBadge` suma el input `title`).

## Added

- Migración `20261029132626-add-includesnotes-to-rewinds.js`: `"includesNotes" BOOLEAN NOT NULL DEFAULT false`.
- `franchisesService.findFranchisesByGameIds`.
- Switch "Use my notes" en `RewindGenerateDialog`, solo para premium, y "Uses your notes" en el panel del dueño.

## Changed

- El resumen pasa a tener 3 párrafos: apertura, perfil del jugador y cierre. Su límite sube a 900 caracteres en el prompt y 1600 en zod, y `maxTokens` sube de 1000 a 3000.
- Los insights no pueden repetir las conclusiones del resumen ni describir un gráfico que la página ya muestra.

## Migration

- Correr `npm run migrate:dev` y `npm run migrate:prod` para agregar `includesNotes`.

## Files of interest

- `apps/api/src/rewind-recap/rewind-recap.prompt.ts`
- `apps/api/src/rewind-recap/utils/build-rewind-recap-content.util.ts`
- `apps/api/src/rewind-recap/utils/build-rewind-recap-patterns.util.ts`
- `apps/web/src/app/features/rewind/components/rewind-generate-dialog/rewind-generate-dialog.ts`

## Commits

- `8ec898a6` — feat(franchises): add a batch lookup of franchise names by game ids
- `98549a99` — feat(rewind): store whether the ai recap uses the run notes
- `dab63299` — feat(rewind): feed opt-in notes, backlog dates and franchises to the ai recap
- `f30b4e5b` — feat(rewind-recap): add pace, backlog wait, franchise and notes columns and new recap patterns
- `2457fade` — test(rewind): cover the notes opt-in and the new recap columns and patterns
- `35ab894a` — feat(rewind): let premium owners opt in to notes for the ai recap
- `9f131488` — test(rewind): cover the notes switch and the owner panel notes label
- `93bcf8dc` — docs(api): document the rewind notes opt-in and the richer ai recap input
- `4dc5e65a` — feat(rewind-recap): center the ai recap summary on the player profile grounded in notes and patterns
- `e0a353cd` — fix(rewind): explain the premium perk when the badge of the premium sections is pressed
