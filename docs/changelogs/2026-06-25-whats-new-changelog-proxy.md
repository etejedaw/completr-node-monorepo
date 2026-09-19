# What's New desde un changelog remoto

**Released:** 2026-06-25

## Summary

La página What's New tenía sus entradas escritas a mano en el componente. Ahora las lee de un changelog JSON publicado fuera de la app. Primero el frontend lo pedía directo al origen, lo que obligaba a abrir su dominio en la CSP. La versión final pasa por un proxy del backend con caché en memoria, así que la CSP del frontend queda como estaba.

## Added

- `GET /changelog`: proxy público (rate limit `publicLimiter`) que lee `CHANGELOG_SOURCE_URL`, con caché en memoria de 5 minutos, timeout de 5 segundos y deduplicación de peticiones en curso.
- Variable de entorno `CHANGELOG_SOURCE_URL`, con valor por defecto.
- `whats-new-page` renderiza las entradas que devuelve `/changelog`.

## Changed

- Se eliminan las entradas hardcodeadas de `whats-new-page`.

## Files of interest

- `apps/api/src/changelog/changelog.controller.ts`
- `apps/api/src/common/config/environment.config.ts`
- `apps/web/src/app/features/whats-new/whats-new-page.ts`
- `docs/api/changelog/get.yml`

## Commits

### Backend

- `a5dc3597` — feat(changelog): add proxy endpoint with in-memory cache
- `d6f43b72` — docs(api): document changelog proxy endpoint

### Frontend

- `884c6aee` — feat(whats-new): consume changelog from landing endpoint
- `c02b8633` — chore(nginx): allow www.completr.app in csp connect-src
- `e44b3d28` — feat(whats-new): fetch changelog from backend proxy
- `e7eb5ec7` — chore(nginx): drop www.completr.app from csp connect-src
