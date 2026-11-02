# Toasts que no sobreviven a la app y tests sin intermitencias

**Released:** 2026-10-29

## Summary

Tras agregar los specs del Rewind, la suite de la web empezó a fallar de vez en cuando, en tests ajenos al cambio. Había dos causas. Por un lado, `ToastService` seguía mostrando toasts y commiteando pendientes después de destruirse: un timer de un test anterior creaba un `NgpToast` con el inyector ya destruido (`NG0205`). Por otro, los contenedores de toast quedaban en el `body` de un test al siguiente, con botones "Dismiss" repetidos. En la API, dos tests asumían que dos registros creados seguidos tienen `createdAt` distintos; cuando coincidían en el mismo milisegundo, el desempate por id (un UUID aleatorio) cambiaba el orden. Las tres causas quedaron corregidas y la suite pasó 3 veces seguidas en la web (3548 tests) y en la API (1624 unitarios y 1929 de integración).

## Fixed

- `ToastService` corta todo al destruirse: limpia los timers de los pendientes sin commitearlos, olvida el manager y no muestra ni encola toasts nuevos (`show` y `pending` no hacen nada y `pending` devuelve `-1`).
- `src/test-environment.ts` borra los contenedores `[data-ngp-toast-container]` después de cada test.
- `toast-container.spec.ts` cuenta solo sus propios toasts.
- `admin-users.integration.test.ts` y `export.integration.test.ts` fijan fechas de creación explícitas cuando verifican "el más nuevo primero".

## Files of interest

- `apps/web/src/app/core/services/toast.ts`
- `apps/web/src/test-environment.ts`

## Commits

- `6fd78686` — test(web): count only the toast container spec's own toasts
- `62da2237` — fix(web): stop showing and committing toasts after the toast service is destroyed
- `130bff0c` — test(web): remove leftover toast containers between tests
- `6d0a06c6` — test(api): give records explicit creation times where tests assert newest first
