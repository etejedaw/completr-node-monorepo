# Nuevas señales para el resumen con IA del Rewind

**Released:** 2026-11-16

## Summary

La entrada del resumen con IA del Rewind suma tres señales: Up Next (los primeros 5 de la cola), las etiquetas de cada juego (`UserGameTags`) y el platino de cada run (`GamePlatinums.backlogId`). Todas respetan los interruptores de privacidad del resumen que ya existían. El prompt describe las señales nuevas y el reto del año puede nombrar un juego de Up Next. La política de privacidad de la landing y los avisos de la app se actualizan para decir qué se envía al proveedor de IA. Las reglas quedan en `docs/rules.md`.

## Highlights

- Up Next, etiquetas y platinos por run entran al contenido que recibe la IA.
- Up Next y los platinos siguen la visibilidad de su sección o `includesPrivateRuns`; las etiquetas siguen a la run; las notas de un platino solo van con `includesNotes`.
- El reto del año solo puede nombrar juegos de Up Next.

## Added

- `rewind-recap/`: constantes de límites (`REWIND_RECAP_UP_NEXT_LIMIT` en 5, etiquetas por fila, grupos de etiquetas y géneros de platino), columnas `tags`, `platinumed` y `daysToPlatinum`, y utilidades `to-up-next-game`, `group-tags-by-game`, `group-platinums-by-run`, `summarize-platinums`, `summarize-platinum-groups`, `days-to-platinum` y `join-recap-tags`.
- `rewind/`: mappers `queue-entry-to-rewind-queued-game` y `platinum-to-rewind-run-platinum`, y `isSectionShared`, que decide si una sección entra por ser pública o por `includesPrivateRuns`.
- `game-platinum`: búsqueda de platinos por ids de run con notas opcionales.
- Tests unitarios de contenido, patrones y prompt, y un test de integración que prueba que la cola, las etiquetas y las notas privadas no llegan a la entrada de la IA.

## Changed

- `rewind-ai-recap.service.ts` reúne las tres señales aplicando los interruptores de privacidad.
- `rewind-recap.prompt.ts` describe las señales nuevas y permite que el reto nombre un juego de Up Next.
- Los helpers de duración de run (`length-range-of`, `resolve-run-hours`) aceptan cualquier par de horas.
- Landing: `privacy-es.md` y `privacy-en.md` listan Up Next, etiquetas y platinos entre los datos enviados a DeepSeek.
- Web: el aviso del proveedor de IA (`rewind-ai-provider-notice`) y la advertencia de runs privadas (`rewind-ai-recap-switches`) mencionan Up Next, etiquetas y platinos.

## Files of interest

- `apps/api/src/rewind/services/rewind-ai-recap.service.ts`
- `apps/api/src/rewind-recap/rewind-recap.prompt.ts`
- `apps/api/src/rewind-recap/utils/build-rewind-recap-content.util.ts`
- `apps/api/src/rewind/utils/is-section-shared.util.ts`

## Commits

- `75857978` — feat(game-platinum): find platinums by run ids with optional notes
- `85d4b1c0` — refactor(rewind): accept any hours pair in the run length helpers
- `0321a370` — feat(rewind): add up next, tags and run platinums to the ai recap content
- `07a47168` — feat(rewind): describe the new signals and let the challenge name an up next game
- `aca25b8e` — feat(rewind): gather up next, tags and run platinums with the recap privacy switches
- `5e8ad5a2` — test(rewind): cover the queue, tag and platinum signals of the ai recap
- `cba4a574` — test(rewind): prove private queue, tags and platinum notes stay out of the ai input
- `cfecced0` — docs(landing): list up next, tags and platinums among the data sent to deepseek
- `bd67356c` — feat(web): mention tags, platinums and up next in the ai provider notice
- `8ea858e4` — feat(rewind): mention up next and platinums in the private runs warning
