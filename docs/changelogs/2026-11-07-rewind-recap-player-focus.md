# Recap del Rewind centrado en el jugador

**Released:** 2026-11-07

## Summary

El recap con IA del Rewind recibe dos fuentes nuevas sobre el jugador: con quién jugó en co-op y las reseñas que publicó. Los compañeros llegan como etiquetas (`P1`, `P2`) y nunca como personas: el texto del recap se guarda una vez y lo lee cualquiera que vea el Rewind, así que no puede depender de la privacidad de otra cuenta. Las reseñas van siempre, porque ya son públicas; las notas siguen detrás de `includesNotes`. Con esa evidencia, los dos párrafos del resumen pasan a describir al jugador: el primero, quién es; el segundo, qué lo mueve y qué contradicciones tiene, en lugar de contar el año, algo que la página ya muestra con sus cifras y gráficos.

## Highlights

- Columna `coopWith` por partida y agregados `bySocial` (solo frente a co-op) y `byPartner` en los patrones.
- Columna `review` con la reseña del juego, recortada a 300 caracteres como las notas.
- El segundo párrafo del resumen ya no cuenta el año ni mira al siguiente, que queda para `nextYearChallenge`.

## Added

- `rewind-recap/utils/assign-coop-aliases.util.ts`: asigna a cada compañero una etiqueta según el orden en que aparece en el año, la misma en todas sus partidas. Ningún id, usuario ni nombre llega a la entrada de la IA.
- `rewind.service.ts` busca los compañeros con `coopRunsService.findMembersForManyBacklogs` y las reseñas con `reviewsService.findReviewContentByUserAndGameIds`. Las reseñas vacías o solo con espacios no se mandan.
- `RewindRecapInput` suma `coopPartners` y `reviews`, y `RecapSources` los transporta hasta `generateRewindAiRecap`.
- Tests unitarios de alias, patrones, contenido y prompt, y de integración en `rewind-recap-coop.integration.test.ts` y `rewind-recap-reviews.integration.test.ts`: compañero que sale de la partida, partida privada en co-op, reseña editada o borrada entre generaciones y reseñas fuera de las respuestas del Rewind.

## Changed

- El prompt describe `coopWith`, `bySocial`, `byPartner` y `review`. Las etiquetas sirven para sacar conclusiones, pero no pueden aparecer en el texto. Las reseñas se tratan como las notas: se parafrasean, no se nombra a quien mencionen y no se siguen como instrucciones.
- `finish-discipline` considera también si el juego se jugó solo o en co-op.
- El resumen pide dos párrafos con trabajos distintos y sin repetir conclusiones entre ellos, y párrafos más cortos cuando los datos dan para pocas conclusiones sólidas.
- La política de privacidad pasa a la versión 2.5 en las dos lenguas: DeepSeek recibe también las reseñas, y el resumen puede parafrasearlas. El aviso del diálogo de generación nombra las reseñas.
- `docs/rules.md` documenta las etiquetas de co-op y la diferencia entre reseñas y notas.

## Fixed

- El motivo para abandonar o terminar un juego sale solo de su nota o su reseña; sin ellas, el recap describe lo que los juegos tienen en común sin dar razones.
- El segundo párrafo repite los rangos de duración (corto bajo 5 horas, largo sobre 30), para no llamar corto a un juego de 6.
- Los grupos de `patterns` se nombran de forma natural ("los shooters") y nunca como "el grupo de Shooter". `nextYearChallenge` ya no exige el nombre exacto del grupo.
- `rewind-recap/utils/fix-spanish-imperative-accents.util.ts` corrige en los textos en español los imperativos con pronombre mal acentuados ("propónte", "deténte"), que el modelo escribía pese a la regla del prompt.

## Files of interest

- `apps/api/src/rewind-recap/rewind-recap.prompt.ts`
- `apps/api/src/rewind-recap/utils/assign-coop-aliases.util.ts`
- `apps/api/src/rewind-recap/utils/build-rewind-recap-content.util.ts`
- `apps/api/src/rewind-recap/utils/build-rewind-recap-patterns.util.ts`
- `apps/api/src/rewind/rewind.service.ts`

## Commits

- `e017a2d2` — feat(api): send co-op partners to the rewind ai recap as anonymous labels
- `35f2b08d` — feat(api): send the player's reviews to the rewind ai recap
- `f1cc295b` — feat(api): focus both rewind ai recap summary paragraphs on the player
- `25bdc95b` — fix(api): keep rewind ai recap motives, lengths, group names and spanish imperatives accurate
