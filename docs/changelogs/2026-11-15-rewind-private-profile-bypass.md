# Rewind visible con el perfil privado

**Released:** 2026-11-15

## Summary

Hasta ahora el perfil era la puerta de entrada a todo: si quien mira no podía ver el perfil, tampoco veía el Rewind, aunque estuviera público. El dueño puede ahora activar en Settings → Privacy "Show my Rewind even if my profile is private". Con la opción encendida, `rewindVisibility` (público o amigos) se aplica sin exigir acceso al perfil en el detalle, el archivo de años y la página e imágenes para compartir, mientras el perfil y las demás secciones siguen restringidos. Viene apagada porque `rewindVisibility` se heredó de `backlogVisibility` en las cuentas existentes, y abrirlo sin pedirlo sería una fuga.

## Added

- `Users.rewindIgnoresProfileVisibility`, editable en `PATCH /users/me` y presente en la exportación de datos personales.
- `resolveRewindViewerAccess` (`rewind/utils/`): calcula el acceso al Rewind y a los platinos sobre `resolveSectionAccess`. Los platinos dentro del Rewind siguen exigiendo acceso al perfil y a `platinumVisibility`.
- Settings → Privacy: la fila nueva debajo de la del Rewind, deshabilitada y con su explicación cuando el Rewind está en "Only you". `UiSwitch` acepta `ariaDescribedBy`.

## Changed

- `buildViewerContext` usa `resolveRewindViewerAccess` en lugar de exigir `access.profile`, así la regla cubre detalle, archivo y share sin repetirse.
- Help explica la excepción del Rewind, y la descripción de Profile en Settings deja de decir que ninguna sección se ve más allá del perfil.
- `docs/rules.md` documenta por qué la opción es voluntaria.

## Migration

- `20261115034610-add-rewindignoresprofilevisibility-to-users.js`: `"rewindIgnoresProfileVisibility" BOOLEAN NOT NULL DEFAULT false`.

## Files of interest

- `apps/api/src/rewind/utils/resolve-rewind-viewer-access.util.ts`
- `apps/web/src/app/features/settings/settings-privacy/settings-privacy.html`

## Commits

- `e752822c` — docs(rules): document why the rewind profile bypass is opt-in
- `234cb2d7` — test(settings): cover the rewind profile bypass toggle with erratic users
- `daee1875` — feat(settings): add a toggle to show the rewind with a private profile
- `f3f89b6f` — docs(api): document the rewind profile bypass in Bruno collection
- `51089feb` — test(rewind): cover the rewind profile bypass for visitors, friends and share
- `6f31be57` — feat(rewind): show the rewind past a private profile when the owner opts in
- `8b181343` — feat(users): store whether the rewind ignores the profile visibility
