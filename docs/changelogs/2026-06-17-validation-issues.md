# Errores de validación por campo

**Released:** 2026-06-17

## Summary

Las respuestas 422 de validación devolvían el error de Zod serializado como texto, sin estructura útil para un formulario. Ahora el middleware de validación traduce los issues de Zod a una lista `{ path, code, message }` que viaja en la respuesta HTTP, y el frontend la usa para marcar cada campo con su error.

## Added

- `ValidationIssue` y campo opcional `issues` en `HttpError`; el error handler lo incluye en la respuesta.
- `validateSchemaMiddleware` construye los issues desde `ZodError` y agrega `source` (`body`, `query` o `params`) al contexto del error.
- Frontend: utils `validation-errors.ts` y `validation-issues.util.ts` y soporte en `error.interceptor.ts` para leer los issues.
- `admin-users` muestra el error de cada campo en los formularios de crear y editar.

## Changed

- El contexto de `COMMON_SCHEMA_INVALID` deja de incluir el mensaje crudo de Zod.

## Files of interest

- `apps/api/src/common/middlewares/validate-schema.middleware.ts`
- `apps/api/src/common/errors/http-error.ts`
- `apps/web/src/app/shared/utils/validation-errors.ts`
- `apps/web/src/app/core/interceptors/error.interceptor.ts`

## Commits

### Backend

- `9a91912d` — feat(errors): expose field-level Zod issues on 422 validation responses (FB-024)
- `6f2821a8` — feat(common): expose zod issues on schema validation error response

### Frontend

- `7b09914a` — feat(admin-users): show inline field validation errors from 422 responses (FB-024)
- `516b6395` — feat(core): surface backend validation issues via shared util and interceptor
- `e68175cb` — feat(admin-users): show per-field validation issues in create and edit forms
