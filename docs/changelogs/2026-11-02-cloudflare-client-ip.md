# IP del cliente detrás de Cloudflare

**Released:** 2026-11-02

## Summary

La clave del rate limit es la IP del cliente. Hasta ahora `resolveClientIp` tomaba la cabecera que indicara `CLIENT_IP_HEADER` (en producción, `cf-connecting-ip`) sin mirar de dónde venía la petición, así que quien llegara directo al servidor podía elegir su clave escribiendo esa cabecera. Ahora la API solo confía en `cf-connecting-ip` cuando el peer está en los rangos publicados de Cloudflare, y la variable desaparece. El proxy `/share/` de la web reenvía el `X-Real-IP` que escribió el nginx de CapRover en lugar de reemplazarlo por su propia IP.

## Added

- `common/config/cloudflare-ip-ranges.config.ts`: rangos IPv4 e IPv6 de Cloudflare, copiados de https://www.cloudflare.com/ips-v4 y https://www.cloudflare.com/ips-v6.

## Changed

- `resolveClientIp` (`common/utils/client-ip.util.ts`) toma como peer `x-real-ip` si trae una IP válida o, si no, `request.ip`, y normaliza las IPv4 mapeadas (`::ffff:a.b.c.d`). Si el peer está en los rangos de Cloudflare (`BlockList` de `node:net`) y `cf-connecting-ip` trae una IP válida, la clave es esa; en cualquier otro caso, el peer.
- `apps/web/nginx.conf`: el `location ^~ /share/` reenvía `X-Real-IP` con `$http_x_real_ip` en lugar de `$remote_addr`.
- `docs/invariants.md` (Rate limiting) describe la resolución de la IP, por qué `x-real-ip` es confiable y que los rangos de Cloudflare no se actualizan solos.
- `docs/context/frontend.md`: `API_UPSTREAM` tiene que apuntar al contenedor interno de la API en producción; con el valor por defecto el pedido vuelve a pasar por Cloudflare y todas las visitas a `/share/` comparten un solo cupo de rate limit.

## Removed

- Variable de entorno `CLIENT_IP_HEADER` (`environment.config.ts` y `.env.example`).

## Fixed

- Un cliente que se conecta al servidor sin pasar por Cloudflare ya no puede cambiar su clave de rate limit enviando `cf-connecting-ip`.
- Las visitas a `/share/` dejan de compartir la clave de rate limit del contenedor de la web.

## Migration

- Quitar `CLIENT_IP_HEADER` de las variables de la API en CapRover: ya no se lee.
- Definir `API_UPSTREAM` en la web apuntando al contenedor interno de la API.

## Files of interest

- `apps/api/src/common/utils/client-ip.util.ts`
- `apps/api/src/common/config/cloudflare-ip-ranges.config.ts`
- `apps/api/test/common/utils/client-ip.util.unit.test.ts`
- `apps/web/nginx.conf`

## Commits

- `f366d0d0` — fix(api): trust cf-connecting-ip only from cloudflare peers
- `6bac0505` — fix(web): forward the caprover x-real-ip on the share proxy
- `3b1d834d` — docs(api): document client ip resolution behind cloudflare
