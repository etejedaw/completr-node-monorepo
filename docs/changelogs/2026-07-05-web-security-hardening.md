# Endurecimiento de seguridad en web y landing (CSP y security.txt)

**Released:** 2026-07-05

## Summary

Cierre de los hallazgos de frontend de la re-auditoría de seguridad del 2026-06-26, trabajados en los repos `completr-node-frontend` y `completr-page-astro`. El cambio central es la eliminación de `'unsafe-inline'` del `script-src` en los CSP de `web.completr.app` y `www.completr.app`: hasta ahora la política permitía ejecutar cualquier script incrustado en el HTML, neutralizando la protección del CSP contra XSS. Se eligió la vía sin nonces ni hashes — eliminar los scripts inline en origen — porque ninguna de las dos propiedades los necesita. Además se publica `/.well-known/security.txt` (RFC 9116), que antes caía en el catch-all del SPA y devolvía `index.html`.

Complementa el trabajo de DNS de la misma sesión (SPF `-all`, DMARC `p=reject`, null MX) y el ajuste de `ACCESS_TOKEN_TTL` a 30m en producción, que no tocan repos.

## Highlights

- `script-src` sin `'unsafe-inline'` en web y landing; Umami y Cloudflare Insights siguen permitidos por allowlist.
- Angular deja de emitir el `onload` inline del critical CSS (`optimization.styles.inlineCritical: false`) — era el único inline handler del build y el CSP estricto lo habría bloqueado, dejando la app a medio estilizar.
- Astro emite los scripts de `BetaSignupForm` y `Screenshots` como archivos externos (`vite.build.assetsInlineLimit: 0`) en vez de incrustarlos en el HTML.
- `security.txt` servido como archivo real desde `public/.well-known/` con contacto `completr@etejeda.dev`.

## Changed

- Frontend: `security-headers.conf` sin `'unsafe-inline'` en `script-src`; `angular.json` desactiva el inlining de critical CSS en producción y añade la entrada de assets para `.well-known` (los globs de Angular ignoran dot-directorios).
- Landing: `nginx.conf` sin `'unsafe-inline'` en `script-src`; `astro.config.mjs` fuerza scripts externos.

## Added

- Frontend: `public/.well-known/security.txt` (Contact, Expires 2027-06-30, Preferred-Languages, Canonical).

## Notas / pendiente

- Verificar tras deploy: consola sin "Refused to execute inline script" en ambas propiedades, formulario de beta y lightbox funcionando, `curl -sI` con `script-src` limpio y `security.txt` como `text/plain`.
- Rocket Loader y Email Obfuscation deben permanecer apagados en Cloudflare — inyectan scripts inline incompatibles con el CSP estricto.
- `style-src 'unsafe-inline'` se mantiene a propósito: Angular lo requiere para estilos dinámicos y el informe no lo señala.

## Files of interest

- Frontend: `security-headers.conf`, `angular.json`, `public/.well-known/security.txt`
- Landing: `nginx.conf`, `astro.config.mjs`

## Commits

Repo `completr-node-frontend`:

- `6af86694` — feat(security): serve security.txt at well-known path
- `c586427c` — build(app): disable critical css inlining for strict csp
- `a24a527d` — fix(security): drop unsafe-inline from script-src

Repo `completr-page-astro`:

- `d27b62d` — build(astro): emit bundled scripts as external files
- `ee3c485` — fix(security): drop unsafe-inline from script-src
