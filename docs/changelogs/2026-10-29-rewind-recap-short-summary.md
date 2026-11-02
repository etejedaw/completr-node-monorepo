# Resumen IA del Rewind en dos párrafos y generación JSON más robusta

**Released:** 2026-10-29

## Summary

El resumen con IA quedó demasiado largo. Ahora tiene como máximo 2 párrafos de 400 caracteres cada uno, unas 5 líneas en el ancho de escritorio. El primero es el perfil del jugador y el segundo, el arco del año. El modelo se pasa con frecuencia de los objetivos de largo y a veces parte la respuesta en dos objetos JSON seguidos. Por eso `iaProvider.generateJson` hace hasta 3 intentos, agrega en cada reintento el motivo del rechazo anterior y une los objetos partidos. En 8 generaciones seguidas con datos reales no falló ninguna, contra 4 de 6 fallidas antes del cambio. El aviso del listón premium vuelve a estar siempre en inglés.

## Changed

- `RewindAiRecapSchema` valida el resumen por párrafos (`REWIND_AI_RECAP_SUMMARY_PARAGRAPHS = 2`, `summaryParagraph`: 280 en el prompt y 400 en zod; total 580 y 820).
- `IaProvider.generateJson`:
    - hace 3 intentos en vez de 2 (`JSON_ATTEMPTS`);
    - agrega a las instrucciones de cada reintento el motivo del último rechazo;
    - parsea con `parseJsonOutput` (`ia/utils/parse-json-output.util.ts`), que une varios objetos JSON seguidos si no repiten claves.
- El toast del listón premium del resumen IA y de las estadísticas premium siempre sale en inglés. Se quitaron las variantes en español y el input `title` de `UiPremiumBadge`.

## Files of interest

- `apps/api/src/ia/ia.provider.ts`
- `apps/api/src/ia/utils/parse-json-output.util.ts`
- `apps/api/src/rewind-recap/schemas/rewind-ai-recap.schema.ts`

## Commits

- `f0b319f9` — feat(ia): retry json generation up to three times with the rejection reason and merge split objects
- `e2c986b6` — feat(rewind-recap): limit the ai summary to two short paragraphs led by the player profile
- `4d62a358` — fix(rewind): keep the premium perk toast of the rewind sections in english
