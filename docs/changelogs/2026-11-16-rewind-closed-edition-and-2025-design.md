# Rewind de una edición cerrada y diseño 2025

**Released:** 2026-11-16

## Summary

Un Rewind de un año cuya edición ya cerró ahora puede existir si un admin lo activa a mano: crea la edición con fechas pasadas y su diseño, inserta la fila del usuario y la completa fuera de la app con las mismas piezas de la generación, sin gastar tiradas, y la congela con la edición de ese año. Para eso se agrega el diseño `2025`, una maqueta de revista que no tiene imágenes para compartir, y se corrigen dos cosas que este caso destapó: un Rewind de un año anterior a la cuenta ya no ofrece regenerarse y su foto de visitante ya no sale vacía.

## Highlights

- Diseño `2025` en la web: portada con collage, "La portada del año", resumen con IA como artículo, "Premios del año" con franja de cifras, stats premium y estantes por trimestre.
- Un diseño puede no tener imágenes para compartir: las de `2025` responden 404 y su página de vista previa no emite `og:image`.
- `runRecap` acepta `spend: null` para escribir el recap sin gastar ni devolver tiradas.

## Added

- Web: `rewind-design-2025` registrado antes de `2026` en `rewind-designs.ts`, con sus piezas propias (`rewind-2025-cover-feature`, `rewind-2025-recap-article`, `rewind-2025-awards`, `rewind-2025-shelves`) y su copy bilingüe.
- API: `"2025"` en `REWIND_DESIGNS`. El catálogo de `rewind-share/templates/share-designs.template.ts` admite `null` y `hasShareImages` decide en un solo lugar.

## Changed

- `runRecap` (`rewind/services/rewind-ai-recap.service.ts`): `spend` puede ser `null`; en ese caso un fallo no devuelve nada.
- `buildRewindSnapshot`: la foto se arma con `firstYear` igual al menor entre el año de la cuenta y el del Rewind, para que un visitante vea un Rewind anterior a la cuenta.
- `buildRewindOwnerControls`: un Rewind de un año anterior a la cuenta no se regenera (`regenerationBlockedBy: "period-closed"`); el POST ya respondía 404.
- `docs/api/` (imágenes y página de compartir, ediciones) y `docs/rules.md` documentan el diseño sin imágenes y el Rewind de una edición cerrada.

## Files of interest

- `apps/web/src/app/features/rewind/components/rewind-design-2025/rewind-design-2025.ts`
- `apps/api/src/rewind-share/templates/share-designs.template.ts`
- `apps/api/src/rewind/services/rewind-freeze.service.ts`
- `apps/api/src/rewind/utils/build-rewind-owner-controls.util.ts`

## Commits

- `0f523917` — feat(rewind-share): add the 2025 rewind design without share images
- `3be3bf4b` — docs(api): document the 2025 rewind design and its missing share images
- `543ce83a` — refactor(rewind): let runRecap write a recap without spending an ai generation
- `c891a65e` — feat(rewind): generate and freeze the rewind of a closed edition with its own design
- `833cb760` — feat(api): add the rewind:generate-closed admin script
- `c5524760` — fix(rewind): keep frozen rewinds older than the account visible to visitors
- `d331bcbb` — fix(rewind): stop offering regeneration of rewinds older than the account
- `b9ebdf63` — test(rewind): cover generating the rewind of a closed edition
- `44f5c77a` — feat(web): add the 2025 magazine rewind design without share
- `3e7c90ee` — feat(web): register the 2025 rewind design before the latest 2026 one
- `871e3018` — docs(rules): document the hand activated closed edition rewind and designs without share images
- `c65fdf1e` — docs(rules): describe the closed edition rewind without referring to a repo script
- `5c486d6e` — refactor(rewind): move the closed edition rewind tool out of the repo
- `b2875f63` — test(rewind): cover frozen rewinds older than the account
- `181d3e60` — test(rewind): cover a recap without spend refunding nothing
- `309c29c7` — chore(api): drop the rewind:generate-closed npm scripts
- `457d7c69` — feat(rewind): add the year awards and figures band for the 2025 design
- `b377b6af` — feat(rewind): show the year awards instead of the bento in the 2025 design
