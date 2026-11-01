# Token vencido en rutas ocultas de admin

**Released:** 2026-11-01

## Summary

Las rutas de admin usan `hiddenRouteMiddleware`, que responde 404 `AUTH_ROUTE_NOT_FOUND` a cualquiera que no sea admin para no revelar que existen. Su `catch` convertía en 404 cualquier error, incluido un access token vencido, y el interceptor de la web solo renueva la sesión ante un 401. Un admin que dejaba un formulario abierto más que la vida del access token veía "The requested resource was not found" al guardar. Ahora un token con firma válida pero vencido responde 401 `AUTH_INVALID_TOKEN`, la web renueva la sesión y reintenta la petición.

## Fixed

- `hiddenRouteMiddleware` distingue `jwt.TokenExpiredError` y responde 401 `AUTH_INVALID_TOKEN`. El 401 se decide antes de mirar el rol, así que un usuario sin permisos con el token vencido recibe la misma respuesta que un admin y, tras renovar, sigue viendo 404.
- Sin token, token con otra firma, token malformado o encabezado basura siguen respondiendo 404.

## Added

- Tests de integración en `apps/api/test/auth/auth.integration.test.ts`: admin y usuario con token vencido (401), tokens falsificados, ausentes o basura (404) y un cambio de contraseña desde Admin que funciona con el token renovado.

## Files of interest

- `apps/api/src/auth/hidden-route.middleware.ts`

## Commits

- `f56fe27b` — fix(auth): answer 401 on hidden admin routes when the access token expired
- `5b87a136` — test(auth): cover expired access tokens on hidden admin routes
