# Preparación para la publicación del código

**Released:** 2026-06-29

## Summary

Antes de abrir el repositorio se sacan del control de versiones los documentos de estrategia y seguimiento internos, y se quitan de la documentación los precios y las cuotas por tier. El frontend suma una política de privacidad dentro de la app y recupera el footer de atribución de fuentes de datos.

## Added

- Página de política de privacidad (`features/legal/privacy`), enlazada desde el login y About.

## Changed

- Los documentos internos de estrategia y feedback dejan de versionarse y pasan a `.gitignore`.
- La documentación y los docs Bruno dejan de mencionar precios y cuotas por tier; `CONTEXT.md` pierde las secciones de monetización e integraciones.

## Fixed

- Vuelve el footer de atribución de fuentes de datos en el app shell.

## Removed

- Regla obsoleta de `docs/lista.csv` en `.gitignore`.

## Files of interest

- `apps/web/src/app/features/legal/privacy/privacy.ts`
- `apps/web/src/app/layout/layout.html`
- `.gitignore`

## Commits

### Backend

- `21b29bf1` — chore: untrack private strategy docs and ignore them
- `5b3528bc` — docs: remove pricing and tier quota specifics for public release
- `acd325a7` — chore: drop stale docs/lista.csv gitignore rule
- `5d496200` — docs(context): remove monetization and integrations sections

### Frontend

- `92cc5f5b` — feat(privacy): add in-app privacy policy page and links
- `3d547b7c` — feat(layout): restore data-source attribution footer in app shell
