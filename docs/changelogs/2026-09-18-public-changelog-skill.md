# Changelog público desde la skill y landing en Código Abierto

**Released:** 2026-09-18

## Summary

El changelog público de `apps/landing/src/content/releases/` se escribía a mano, sin un proceso que lo conectara con los changelogs técnicos, y fue quedando atrás respecto de lo entregado. La skill `changelog` pasa a generar las dos cosas: el archivo técnico de cada grupo y, cuando el usuario nota el cambio, su entrada pública. Además, la sección de Código Abierto de la landing suma `apps/landing` ahora que la landing vive en el monorepo.

## Highlights

- La skill `changelog` decide qué grupos llevan entrada pública y genera el archivo con `release-template.md`.
- Las reglas de idioma del changelog público quedan documentadas: inglés para lo que ve la app, español para lo que ve la landing.
- La sección de Código Abierto lista `apps/landing` y muestra Astro en la barra de lenguajes.

## Added

- `.claude/skills/changelog/release-template.md`: formato de una entrada pública.
- Paso 7 de la skill `changelog`: cuándo hay entrada pública, cómo se agrupa, nombre del archivo, campos, idiomas y tono.
- `apps/landing` en la lista de carpetas de `OpenSource.astro`, con color propio para Astro.

## Changed

- `.claude/skills/changelog/template.md` pasa a llamarse `changelog-template.md`.
- `OpenSource.astro`: el texto nombra la app, la API y la landing; el snapshot de lenguajes de respaldo se actualiza con Astro.
- `docs/context/landing.md`: la API reexpone `/changelog.json` en `GET /changelog` y `apps/web` lo muestra en "What's new"; cada campo del changelog público tiene su idioma.
- `docs/context/conventions.md`: la post-edición obligatoria incluye `astro check` y `npm run build:landing` cuando se toca la landing.

## Files of interest

- `.claude/skills/changelog/SKILL.md`, `.claude/skills/changelog/release-template.md` — proceso y formato del changelog público.
- `apps/landing/src/components/OpenSource.astro` — sección de Código Abierto.
- `docs/context/landing.md` — consumidores e idiomas del changelog público.

## Commits

- `867eff0f` — feat(landing): list landing app in open source section
- `62af7a3f` — docs(skills): generate public release entries from changelog skill
- `9dbac6be` — docs(landing): document public changelog languages and consumers
- `282ab241` — docs(skills): rename changelog template to changelog-template
- `077ceb5e` — docs(repo): add landing checks to post-edit steps
