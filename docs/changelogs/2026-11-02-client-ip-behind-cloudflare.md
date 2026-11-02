# IP del cliente detrás de Cloudflare

**Released:** 2026-11-02

## Summary

El rate limit usa la IP del cliente como clave. Hasta ahora se tomaba de la cabecera que indicara `CLIENT_IP_HEADER` (en producción `cf-connecting-ip`) sin comprobar de dónde venía la request: quien se conectara directo al servidor, sin pasar por Cloudflare, podía inventarse esa cabecera y cambiar de clave en cada request. Ahora `resolveClientIp` toma primero el peer (`x-real-ip`, que el nginx de CapRover siempre pisa, o la IP del socket) y solo acepta `cf-connecting-ip` si ese peer está en los rangos publicados de Cloudflare. La variable `CLIENT_IP_HEADER` desaparece. El proxy de `/share/` de la web reenvía el `X-Real-IP` que recibió de CapRover en lugar de pisarlo, para que la API siga viendo el edge de Cloudflare en ese salto extra.

## Highlights

- `cf-connecting-ip` solo cuenta si la request llegó desde un rango de Cloudflare; no hace falta firewall para que no se pueda falsificar.
- `x-forwarded-for` no se usa.
- Las visitas a `/share/` dejan de compartir un solo cupo de rate limit, siempre que `API_UPSTREAM` apunte al contenedor interno de la API.

## Added

- `apps/api/src/common/config/cloudflare-ip-ranges.config.ts`: rangos IPv4 e IPv6 de Cloudflare copiados de https://www.cloudflare.com/ips-v4 y https://www.cloudflare.com/ips-v6.

## Changed

- `resolveClientIp` (`common/utils/client-ip.util.ts`) ya no recibe el nombre de la cabecera: resuelve el peer, normaliza las IPv4 mapeadas (`::ffff:a.b.c.d`) y decide con los rangos de Cloudflare.
- `apps/web/nginx.conf`: `proxy_set_header X-Real-IP $http_x_real_ip` en el `location ^~ /share/`.
- `docs/invariants.md` (Rate limiting) y `docs/context/frontend.md` documentan el mecanismo y por qué `API_UPSTREAM` tiene que ser `http://srv-captain--<app-de-la-api>:<puerto>`.

## Removed

- Variable de entorno `CLIENT_IP_HEADER` (en `environment.config.ts` y `.env.example`).

## Migration

- En CapRover, quitar `CLIENT_IP_HEADER` de la API y definir `API_UPSTREAM` en la web con la URL interna de la API, con esquema `http://` y el puerto del contenedor.
- Si Cloudflare publica rangos nuevos, actualizar `cloudflare-ip-ranges.config.ts`. Mientras tanto, el tráfico que llegue desde un rango nuevo queda agrupado por la IP del edge.

## Files of interest

- `apps/api/src/common/utils/client-ip.util.ts`
- `apps/api/src/common/config/cloudflare-ip-ranges.config.ts`
- `apps/web/nginx.conf`

## Commits

- `f366d0d0` — fix(api): trust cf-connecting-ip only from cloudflare peers
- `6bac0505` — fix(web): forward the caprover x-real-ip on the share proxy
- `3b1d834d` — docs(api): document client ip resolution behind cloudflare
