# Mensajes de error del admin web

**Released:** 2026-10-21

## Summary

El admin web traduce los códigos de error del catálogo a mensajes claros y accionables desde un solo mapeo, y el editor de juegos valida scores y duraciones antes de enviar. Desactivar o borrar un juego ya no falla en silencio.

## Highlights

- Mapeo central código → mensaje en `adminErrorMessage`, con el mismo patrón que `plan-limit-message`.
- El editor de juegos marca los scores fuera de 0..scale y las duraciones no positivas, y muestra los errores de la API en el banner del formulario.
- `GAME_IN_USE` sugiere desactivar el juego en lugar de borrarlo.

## Added

- `core/utils/admin-error-message.ts`: textos para `GAME_SCORE_OUT_OF_RANGE`, `GAME_IN_USE`, `GAME_NOT_FOUND`, `GAME_UNIQUE_CONSTRAINT`, `GAME_VARIANT_REQUIRED`, los `COMMON_SCHEMA_INVALID` de scores y duraciones, y los códigos de `genres` y `platforms`, que aún no tienen pantalla.
- `admin-game-editor`: validación por fila con `aria-invalid` y `aria-describedby`, máximo por fuente tomado de `ScoreSourcesService.getScale` y banner con `role="alert"`.

## Changed

- `errorInterceptor`: el aviso de los 409 usa el mapeo central.
- `games.ts`: los PUT masivos de scores y tiempos suprimen el aviso de validación, porque el error queda en el formulario.
- `docs/context/frontend.md`: convención de mensajes de error del admin.

## Fixed

- `game-detail`: los errores al desactivar o borrar un juego se muestran y cierran el panel de confirmación.

## Files of interest

- `apps/web/src/app/core/utils/admin-error-message.ts`
- `apps/web/src/app/features/games/admin-game-editor/admin-game-editor.ts`
- `apps/web/src/app/core/interceptors/error.interceptor.ts`

## Commits

- `0d1e3725` — feat(web): add admin error message mapper for catalog and score errors
- `ec486449` — feat(web): use admin error messages in 409 toasts
- `4197fda5` — feat(web): show API errors and validate scores and durations in game editor
- `db26785a` — fix(web): report errors when deactivating or deleting a game
- `0edde6a1` — docs(frontend): document admin error message convention
