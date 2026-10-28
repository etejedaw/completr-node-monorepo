# Rewind compartido bajo el dominio de la web

**Released:** 2026-10-28

## Summary

El enlace compartido del Rewind y su imagen de vista previa usaban el dominio de la API (`API_PUBLIC_URL`). Ahora todo vive bajo el dominio de la web: la API sirve las imágenes junto a la página de vista previa, en `/share/rewind/:username/:year/`, y el nginx de la web hace proxy de `/share/` hacia la API. Las imágenes se siguen generando bajo demanda en la API, con su caché en memoria; no se guardan en disco. Las rutas viejas `/users/:username/rewinds/:year/{og,story}.png` se eliminaron, porque en la web `/users` es una ruta de Angular.

## Highlights

- `GET /share/rewind/:username/:year/og.png` y `/story.png`, con la misma privacidad y los mismos errores que antes.
- `og:image` y la redirección se arman con `WEB_APP_URL`; `API_PUBLIC_URL` dejó de existir.
- Copy link, Share y Download image usan el origen de la propia web.

## Changed

- `rewind-share.routes.ts` y `rewind-share.service.ts`: rutas nuevas bajo `/share/` y URLs absolutas con `WEB_APP_URL`.
- `apps/web/nginx.conf` pasa a ser una plantilla de la imagen oficial de nginx (`/etc/nginx/templates/default.conf.template`, con envsubst). `location ^~ /share/` hace `proxy_pass` a `${API_UPSTREAM}` con resolver (nginx arranca aunque la API no esté arriba), reenvía `Host`, `X-Forwarded-For`, `X-Forwarded-Proto` y `CF-Connecting-IP`, conserva las cabeceras de caché de la API y reemplaza sus cabeceras de seguridad por las de `security-headers.conf`. El `^~` evita que la regla de estáticos capture los `.png`.
- `apps/web/Dockerfile`: copia la plantilla y define `NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1` y `API_UPSTREAM=https://api.completr.app` por defecto.
- `apps/web/proxy.conf.json` manda `/share` a `http://localhost:3002` en `ng serve` (enganchado en `angular.json`).
- `ngsw-config.json`: `navigationUrls` excluye `/share/**`, para que el service worker no responda el enlace con el `index.html` de la SPA.
- `features/rewind/rewind.ts`: el enlace se arma con `window.location.origin` y las imágenes se piden con ruta relativa.
- Bruno: `docs/api/rewind-share/`. Docs: `architecture.md` y `context/frontend.md`.

## Removed

- `API_PUBLIC_URL` de `environment.config.ts` y `.env.example`.
- `GET /users/:username/rewinds/:year/story.png` y `/og.png` (responden 404).

## Migration

- En producción, definir `API_UPSTREAM` en la web con la URL interna de la API (por ejemplo `http://srv-captain--<app-de-la-api>`). Sin ella usa `https://api.completr.app`, que funciona pero sale por internet.
- En local, reiniciar `ng serve` para que tome `proxy.conf.json`.

## Commits

- `824c0de7` — feat(api): serve rewind share images under /share and build og urls from WEB_APP_URL
- `7baa4415` — feat(web): proxy /share to the API in nginx and ng serve
- `d0f1d064` — feat(web): use the web origin for rewind share link and images
- `8cbcce8f` — docs: document rewind share routes under the web domain
