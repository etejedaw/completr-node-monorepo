# Limpieza de entidades HTML legacy

**Released:** 2026-06-09

## Summary

Cierra FB-067. Datos importados antes del fix de XSS-sanitizer (Fase 2.5) quedaron con entidades HTML codificadas en los text fields (títulos, descripciones, notas). Se agrega un helper de decodificación en `common/utils` y una migración one-off que recorre los registros afectados y los limpia en su lugar. La migración es idempotente — se puede correr de nuevo sin riesgo.

## Highlights

- Helper `decodeHtmlEntities` en `src/common/utils/` reutilizable.
- Migración Sequelize one-off que limpia datos existentes.
- Cierra FB-067.

## Added

- **`decodeHtmlEntities` util:** en `src/common/utils/decode-html-entities.util.ts`. Decodifica `&amp;`, `&quot;`, `&#39;`, etc.
- **Migración one-off:** recorre `Game.title`, `Game.description` y otros campos afectados y decodifica entidades.

## Files of interest

- `src/common/utils/decode-html-entities.util.ts`.
- `migrations/` — la migración one-off de backfill.

## Commits

- `cee2098` — feat(utils): add decodeHtmlEntities helper to repair legacy encoded data
- `76ded39` — feat(migrations): add one-off backfill to decode legacy HTML entities (FB-067)
