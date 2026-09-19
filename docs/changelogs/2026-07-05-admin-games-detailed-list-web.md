# Listado detallado de juegos en el admin (frontend)

**Released:** 2026-07-05

## Summary

Complemento de frontend de `2026-07-05-admin-games-detailed-list.md`. El listado de juegos del admin pide la forma detallada de la respuesta, que incluye las plataformas.

## Changed

- `admin-games` pide la forma detallada y protege el render de plataformas.

## Fixed

- Se quita un fallback redundante de plataformas.

## Files of interest

- `apps/web/src/app/features/admin/admin-games/admin-games.ts`

## Commits

- `238172e0` — feat(admin-games): request detailed shape and guard platforms in list view
- `b18bd2ab` — fix(admin-games): drop redundant platforms fallback in list view
