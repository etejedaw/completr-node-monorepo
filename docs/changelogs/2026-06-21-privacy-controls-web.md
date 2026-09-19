# Follow requests y visibilidad por sección (frontend)

**Released:** 2026-06-21

## Summary

Complemento de `2026-06-19-privacy-controls.md`. Ese changelog cubre el modelo y la adopción de los enums de visibilidad; este suma la UI de follow requests, los controles segmentados de privacidad y la documentación Bruno de los endpoints de follow requests.

## Added

- Servicio `follow-requests` con un signal compartido de solicitudes entrantes.
- Botón de follow con estado "Requested" y opción de cancelar en `public-profile`.
- Toggle `acceptFollowRequests` y gestión de solicitudes pendientes en `settings-privacy`.
- Card destacada con solicitudes pendientes al inicio del feed.
- Bruno: `docs/api/user-follow-requests/` (listar entrantes, aceptar, rechazar, cancelar saliente) y respuesta actualizada de follow.

## Changed

- `settings-privacy` reemplaza los dropdowns de visibilidad por controles segmentados con leyenda.
- Bruno: `update-me` documenta los enums de visibilidad.

## Files of interest

- `apps/web/src/app/core/services/follow-requests.ts`
- `apps/web/src/app/features/settings/settings-privacy/settings-privacy.html`
- `apps/web/src/app/features/feed/feed-page.ts`
- `docs/api/user-follow-requests/`

## Commits

### Backend

- `e76ef356` — docs(api): document follow requests endpoints and updated follow response
- `5348ea12` — docs(api): document visibility enums in update-me endpoint

### Frontend

- `6d4e4d6b` — feat(follow-requests): add core service with shared signal for incoming requests
- `63a8128a` — feat(public-profile): support Requested state and cancel for follow button
- `688c03ca` — feat(settings-privacy): add accept-follow-requests toggle and pending requests management
- `582e2c80` — feat(feed): show highlighted card with pending follow requests on top
- `34e3e7a3` — feat(settings-privacy): replace dropdowns with segmented controls and add legend
