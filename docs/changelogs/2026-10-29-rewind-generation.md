# Rewind generado por el usuario, con resumen IA y estadísticas premium

**Released:** 2026-10-29

## Summary

El Rewind deja de publicarse solo al abrir el año. Ahora lo activa su dueño: desde el 1 de diciembre ve en su perfil "Generate your Rewind", elige el idioma (inglés o español) y si incluye sus runs privadas, y recién entonces los demás pueden ver ese año. La generación se guarda en la tabla nueva `Rewinds`, que lleva el idioma, la elección de privadas, la fecha de generación, los contadores de regeneración y, para premium, el resumen con IA y las estadísticas. Así la IA no se llama cada vez que alguien abre la página. Las cifras de siempre (tally, highlights y línea de tiempo) se siguen calculando al vuelo con la privacidad de quien mira. El resumen lo escribe el módulo nuevo `rewind-recap` con `iaProvider.generateJson` y un schema de zod con límites de caracteres y un catálogo fijo de 7 tipos de insight. Las estadísticas premium son cálculos puros. La página `/user/:username/rewind/:year` es la única bilingüe de la app y se muestra a todos en el idioma que eligió el dueño, igual que las imágenes para compartir.

## Highlights

- `POST /users/me/rewinds/:year` genera o regenera (una regeneración, más una de gracia del 1 al 7 de enero del año siguiente) y `POST /users/me/rewinds/:year/ai-recap` reintenta el resumen o lo agrega a un año ya generado.
- `expectedGeneratedAt` con bloqueo de fila: un doble clic responde 409 `REWIND_GENERATION_CONFLICT` sin gastar la regeneración.
- Resumen IA (titular, resumen, 3 insights, dato curioso y reto) y 4 gráficas premium (horas por mes, gusto vs. crítica, flujo del backlog y géneros), con marco dorado y visibles para todos los visitantes.
- Página, panel del dueño, personas, meses y números en inglés o español con `Intl`.

## Added

- Migración `20261029003632-create-rewinds-table.js`: tabla `"Rewinds"` con `"userId"` (FK `ON DELETE CASCADE`), `year`, `language` (`enum_Rewinds_language`), `"includesPrivateRuns"`, `"generatedAt"`, `"regenerationsUsed"`, `"graceUsed"`, `"aiRecap"` y `"premiumStats"` (JSONB), `"aiRecapStatus"` (`enum_Rewinds_aiRecapStatus`: `none`, `pending`, `ready`, `failed`), `"aiRecapRequestedAt"` e índice único `("userId", year)`.
- Modelo `Rewind` y asociación `User.hasMany(Rewind)`.
- Códigos nuevos en las 3 capas:
    - `REWIND_NOT_GENERATED` (404);
    - `REWIND_GENERATION_CONFLICT` y `REWIND_REGENERATION_LIMIT` (409);
    - `REWIND_AI_RECAP_PREMIUM_REQUIRED` (402);
    - `REWIND_AI_RECAP_EXISTS` y `REWIND_AI_RECAP_IN_PROGRESS` (409);
    - `REWIND_AI_RECAP_FAILED` (503).
- `rewindGenerationLimiter`: 5 generaciones cada 10 minutos, compartido por los dos POST.
- Módulo `apps/api/src/rewind-recap/`:
    - `RewindAiRecapSchema` (máximos de zod 100/650/50/200/200/180 y exactamente 3 insights de kinds distintos);
    - prompt en inglés con el idioma de salida parametrizado;
    - entrada compacta de hasta 200 juegos activos en el año (primero terminados y abandonados), con los totales del año completo y del anterior;
    - `buildRewindPremiumStats`.
- `backlogService.countRunsAddedByMonth` para el flujo del backlog.
- Contrato compartido en `rewind.interface.ts` y `rewind.model.ts`: `RewindLanguage`, `REWIND_INSIGHT_KINDS`, `RewindAiRecap`, `RewindPremiumStats`, `RewindOwnerControls` y `GenerateRewindRequest`, y en las respuestas `isGenerated`, `language`, `generatedAt`, `aiRecap`, `premiumStats` y `ownerControls`.
- Web:
    - `RewindGenerateDialog` con `injectRewindGenerateFlow`: la petición sobrevive al cierre del diálogo y avisa con un toast;
    - `RewindOwnerPanel`, bilingüe;
    - `RewindAiRecap` y `RewindPremiumStats`, con gráficas en CSS propio y tablas accesibles;
    - invitación a generar en el spotlight del perfil y tarjetas "Generate" para años sin generar;
    - diccionario `en`/`es` en `rewind-copy.ts` y personas en ambos idiomas.
- Bruno: `generate-own-rewind.yml` y `add-own-rewind-ai-recap.yml`.

## Changed

- `GET /users/:username/rewinds` y `GET /users/:username/rewinds/:year`:
    - el visitante solo ve años generados;
    - el dueño ve todos los años abiertos con `isGenerated`, y un año sin generar le responde 404 `REWIND_NOT_GENERATED`.
- Las imágenes de `rewind-share` responden 404 para años sin generar y salen en el idioma del Rewind. La caché incluye el idioma y la página de vista previa lleva `<html lang>`.
- La IA y las estadísticas solo reciben runs privadas si el dueño lo elige, y platinos solo si `platinumVisibility` es pública o se incluyen privadas.
- Perder premium no borra el resumen ya generado; regenerar sin premium conserva el anterior.
- `rewind-year-params.schema.ts` pasa a `apps/api/src/rewind/schemas/`.

## Migration

- Correr `npm run migrate:prod` (y `npm run migrate:dev` en local) para crear `"Rewinds"`. Sin la tabla, las lecturas y las imágenes del Rewind responden 500.
- Definir `DEEPSEEK_API_KEY` en la API de producción. Sin ella, la generación funciona pero el resumen queda en `failed`.

## Files of interest

- `apps/api/src/rewind/rewind.service.ts`
- `apps/api/src/rewind/utils/plan-rewind-generation.util.ts`
- `apps/api/src/rewind-recap/rewind-recap.prompt.ts`
- `apps/api/src/rewind-recap/schemas/rewind-ai-recap.schema.ts`
- `apps/api/src/rewind-recap/utils/build-rewind-recap-content.util.ts`
- `apps/web/src/app/features/rewind/components/rewind-generate-dialog/rewind-generate-flow.ts`
- `apps/web/src/app/features/rewind/rewind-detail/rewind-detail.html`
- `docs/invariants.md`

## Commits

- `8ec52b37` — feat: add rewind generation contract with ai recap, premium stats and owner controls
- `73dc896c` — feat(rewind): add generate and ai recap requests to the rewind service
- `9fd48901` — feat(rewind): add generate dialog with a flow that survives closing mid-request
- `9570d83b` — feat(rewind): add bilingual owner panel to regenerate and add the ai recap
- `f96b960c` — feat(rewind): let the owner generate unpublished years from the year card
- `647aa524` — feat(rewind): invite the owner to generate the spotlight year on the profile
- `57bf300f` — feat(rewind): add english and spanish copy with intl formatting to rewind components
- `490e3ab9` — feat(rewind): add ai recap section with premium frame
- `fe9a8501` — feat(rewind): add premium stats charts section
- `5eb71bba` — feat(rewind): render detail page in the rewind language with ai recap, premium stats and owner panel slot
- `fc98a7d2` — docs(web): document bilingual rewind page and premium sections
- `52d1770c` — feat(rewind): wire owner panel, generate dialog and year card language into the detail page
- `a43b4567` — feat(rewind-recap): generate ai recap and premium stats for rewind
- `917c08fa` — test(rewind-recap): cover recap content, prompt, schema, service and premium stats
- `83e90d14` — feat(api): add rewinds table and model
- `9acb1760` — feat(backlog): count runs added to the backlog by month
- `8820ad4a` — feat(rewind): let owners generate and regenerate rewinds with ai recap and premium stats
- `f061d41a` — feat(rewind-share): render share images in the rewind language and hide ungenerated years
- `474f0e2f` — test(rewind): cover generation, regeneration, grace window and visibility rules
- `bd813526` — test(rewind-share): cover spanish share images and ungenerated years
- `13f31cb4` — docs(api): document rewind generation endpoints, rules and share languages
- `092a70f6` — test(rewind): align profile and detail specs with generated rewinds and the owner panel
