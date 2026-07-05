# Filtro de feed por categoría y tipo (premium)

**Released:** 2026-07-04

## Summary

El endpoint `GET /feed` ahora acepta filtros por categoría (`games`, `lists`, `social`) y por tipos de actividad granulares (CSV validado contra el enum `ActivityType`). El filtrado es una capacidad premium: los usuarios free que envían `category` o `types` reciben `402 ACTIVITY_FEED_FILTER_PREMIUM`; sin esos parámetros el feed funciona igual para todos. El gate vive en el backend mediante un error de dominio propio del módulo `activity`, que hasta ahora no tenía capa de errores.

## Highlights

- Filtro `category` (games/lists/social) y `types` (CSV granular) sobre el feed.
- Gate premium por error de dominio (`402`), no dependiente del frontend.
- Nuevo bloque de errores del módulo `activity` registrado en el normalizer global.

## Added

- `GET /feed?category=&types=` con validación Zod (`FeedQuerySchema`).
- Error de dominio `ACTIVITY_FEED_FILTER_PREMIUM` (`activity.domain-error` + mapper HTTP a 402).
- Resolución de tipos permitidos combinando categoría e intersección con `types`.

## Changed

- `getFeed` acepta un `filter` opcional y aplica `type IN (...)` junto a la exclusión de tipos sociales ya existente.
- La ruta `/feed` valida con `FeedQuerySchema` en vez de `PaginationQuerySchema`.

## Files of interest

- `src/activity/activity.service.ts` — resolución de tipos y query.
- `src/activity/activity.controller.ts` — gate premium.
- `src/activity/schemas/feed-query.schema.ts`
- `src/activity/errors/activity.domain-error.ts` y `activity.domain-to-http.mapper.ts`
- `src/common/errors/global-error-http.normalizer.ts`

## Commits

- `52e5524` — feat(activity): add premium gate error for feed filtering
- `ae90e3b` — feat(activity): filter feed by category and type
- `baad7e9` — docs(api): document feed filter query params
