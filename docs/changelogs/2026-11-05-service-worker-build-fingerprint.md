# Huella de build en el service worker

**Released:** 2026-11-05

## Summary

Un service worker aplica la CSP que venía con su script cuando se instaló, y el navegador solo lo reinstala si `ngsw-worker.js` cambia byte a byte. Angular genera ese archivo idéntico en cada build mientras no cambie su versión, así que los clientes que ya tenían el worker siguieron con la CSP anterior después de que `security-headers.conf` sumara `images.igdb.com`. El worker bloqueaba las imágenes de IGDB y respondía 504, aunque la página ya sirviera la política nueva. Ahora el `postbuild` de `apps/web` agrega al final del worker una huella del build, de modo que cada cambio en la app o en los headers produce un script distinto y el navegador lo reinstala en la siguiente visita.

## Highlights

- Los cambios de CSP llegan a los clientes que ya tienen el service worker, sin que tengan que borrar datos del sitio.
- La huella es determinista: si no cambian la app ni los headers, el worker queda igual y no se reinstala.

## Added

- `apps/web/scripts/stamp-service-worker.mjs`: agrega `self.completrBuildFingerprint = "<hash>";` al final de `dist/completr/browser/ngsw-worker.js`. El hash es SHA-256 del worker sin la huella, de `ngsw.json`, de `security-headers.conf` y de `nginx.conf`, truncado a 16 caracteres. Si el script ya tenía una huella, la reemplaza.
- Script `postbuild` en `apps/web/package.json`, que corre el anterior después de `ng build`, también dentro del build de Docker.

## Fixed

- Las imágenes de IGDB dejan de fallar por CSP en navegadores y PWA instaladas que tenían el service worker anterior al cambio de `security-headers.conf`.

## Files of interest

- `apps/web/scripts/stamp-service-worker.mjs`
- `apps/web/package.json`
- `docs/context/frontend.md`

## Commits

- `4f417be3` — fix(web): stamp the service worker with a build fingerprint
- `921ff50e` — docs(web): document the service worker build fingerprint
