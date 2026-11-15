# Rewind por enlace con el perfil privado

**Released:** 2026-11-15

## Summary

Se elimina el ajuste "Show my Rewind even if my profile is private" (`rewindIgnoresProfileVisibility`) antes de que llegue a producción. En su lugar, el detalle de un año y la página e imágenes para compartir siguen solo `rewindVisibility` aunque quien mira no pueda ver el perfil, mientras que el archivo de años y el perfil siguen exigiendo acceso al perfil. Así el dueño comparte su Rewind por enlace sin un ajuste extra, y nadie lo descubre navegando.

## Changed

- `resolveRewindViewerAccess` recibe por qué entrada se llega (`RewindEntryPoint`: `link` o `archive`) en vez del dueño. `getRewindForViewer` y `getOwnRewind` usan `link`, que no exige el perfil; `getRewindYearsForViewer` usa `archive`, que sí. `rewind-share` usa `getRewindForViewer` y queda por enlace sin cambios propios. Los platinos siguen exigiendo perfil y `platinumVisibility`.
- `PATCH /users/me` ya no acepta `rewindIgnoresProfileVisibility` (422 `COMMON_SCHEMA_INVALID`, el schema es estricto) y ni `/users/me` ni el export de datos personales lo devuelven.
- Web: Settings → Privacy pierde el interruptor y el Rewind muestra siempre su propio nivel; Help explica el acceso por enlace. "More Rewinds" ya se ocultaba sin error cuando el archivo responde 403 y ahora tiene spec.
- Documentación: `docs/rules.md` reemplaza la regla del ajuste por la del acceso por enlace; Bruno actualiza `users/update-me.yml` y los `.yml` de `rewind` y `rewind-share`. La entrada pública del día describe el acceso por enlace.

## Migration

- `20261115161926-remove-rewindignoresprofilevisibility-from-users.js` borra la columna (`DROP COLUMN IF EXISTS`); el `down` la recrea con `DEFAULT false`. La columna se había agregado en `20261115034610-add-rewindignoresprofilevisibility-to-users.js`, que no llegó a producción.

## Commits

- `2f10bed8` — feat(rewind): open a rewind by link even with a private profile and drop the profile bypass setting
- `15dffc28` — test(rewind): cover rewind access by link and by archive with a private profile
- `5985e18f` — docs(bruno): describe rewind access by link and remove the profile bypass field
- `1e419683` — feat(settings): remove the rewind profile bypass switch from privacy
- `b0b81ec2` — test(web): cover privacy settings without the rewind switch and more rewinds without archive access
- `3a64e0a1` — docs: document rewind access by link and update its release entry
