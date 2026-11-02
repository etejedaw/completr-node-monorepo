# IP real del cliente, rate limit en local y enfriamiento del reset

**Released:** 2026-10-28

## Summary

En producción la API está detrás de Cloudflare y del nginx de CapRover, así que `request.ip` era la IP del proxy y todos los usuarios compartían el mismo contador del rate limit: unos pocos intentos fallidos de cualquiera bloqueaban al resto. El rate limiter ahora resuelve la IP desde una cabecera configurable (`CF-Connecting-IP` en producción) y cae a `request.ip` si falta o no es válida. No se usa `trust proxy` porque el número de saltos varía por ruta: las de `/share/` pasan además por el nginx de la web. En la misma tanda se agregó un interruptor para apagar el rate limit en desarrollo y un enfriamiento por cuenta en `POST /auth/forgot-password`, que antes solo tenía límite por IP.

## Highlights

- `CLIENT_IP_HEADER`: cabecera de la que el rate limiter toma la IP del cliente.
- `RATE_LIMIT_ENABLED=false` apaga el rate limit en local, sin depender de `NODE_ENV`.
- `PASSWORD_RESET_COOLDOWN_MINUTES` (por defecto 5): dentro del enfriamiento no se crea otro token ni se envía otro correo, y la respuesta sigue siendo 204.

## Added

- `apps/api/src/common/utils/client-ip.util.ts` con `resolveClientIp`: toma el primer valor de la cabecera configurada, lo acepta solo si `net.isIP` lo reconoce y si no cae a `request.ip` (o `"unknown"`).
- Variables `CLIENT_IP_HEADER`, `RATE_LIMIT_ENABLED` y `PASSWORD_RESET_COOLDOWN_MINUTES` en `environment.config.ts` y `.env.example`.
- Tests unitarios de `resolveClientIp` y del middleware (en procesos hijos, porque `environmentConfig` es inmutable).

## Changed

- `rate-limiter.middleware.ts` usa `resolveClientIp` y se salta con `NODE_ENV === "test"` o con `RATE_LIMIT_ENABLED=false`. Sin la variable el rate limit queda activo.
- `password-reset.service.createPasswordResetToken` devuelve `string | null`: dentro de una transacción toma `pg_advisory_xact_lock` por usuario y, si hay un token creado dentro del enfriamiento, devuelve `null` y `auth.service` no envía correo. El lock evita dos tokens y dos correos con pedidos concurrentes.
- `docs/invariants.md`: secciones de recuperación de contraseña y rate limiting.

## Migration

- En producción, definir `CLIENT_IP_HEADER=cf-connecting-ip` en la API. La API debe ser alcanzable solo a través de Cloudflare: un cliente que llegue directo al origen podría falsear la cabecera.
- En local, `RATE_LIMIT_ENABLED=false` en `apps/api/.env.dev.local` para trabajar sin límites.

## Commits

- `06c24139` — feat(api): resolve client ip from CLIENT_IP_HEADER and add RATE_LIMIT_ENABLED switch
- `28471bd4` — feat(auth): add per-account cooldown to password reset requests
- `fc03d0f2` — docs(invariants): document client ip header, rate limit switch and reset cooldown
