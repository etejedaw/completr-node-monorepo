# Refresh de token compartido y dependencias de la web en una dirección

**Released:** 2026-11-15

## Summary

El refresh del access token dependía de la suscripción de la primera petición que recibía un 401: si esa petición se cancelaba, las demás quedaban esperando para siempre. Ahora hay un único refresh compartido que no depende de quién lo lanzó. En el mismo bloque, `core/` y `shared/` dejan de importar de `features/` y los ciclos entre features se rompen subiendo lo compartido.

## Highlights

- Tras volver de una suspensión, cancelar un typeahead o abandonar una página ya no deja el resto de la app en esqueleto.
- Cero ciclos directos entre features (había 10) y cero imports de `shared/` o `core/` hacia `features/`.

## Fixed

- **Refresh.** `error.interceptor.ts` usa un refresh compartido que sobrevive a la cancelación de la petición que lo lanzó. Un refresh que termina sin token guardado cierra la sesión en vez de reintentar con `Bearer null`.
- **`isLoggedIn`.** Deriva de un signal del token, que también se actualiza cuando otra pestaña inicia o cierra sesión; antes leía `localStorage` dentro de un `computed`.
- **Solicitudes de seguimiento.** `FollowRequestsService` se reinicia al cambiar de cuenta y descarta la respuesta tardía de la cuenta anterior.

## Changed

- Pasan a `core/services/`: `favorites`, `queue`, `platinum`, `games`, `reviews`, `public-social` y `premium-access-admin`.
- Pasan a `shared/`: `inject-game-search` (`shared/utils/`), `profile-section-header`, `profile-access-state` y `admin-premium-access` (`shared/components/`), que ahora tipa su usuario con `PremiumAccessUser`.
- Los pares feature→feature bajan de 51 a 36; los que quedan son reutilización de componentes de la vista dueña, que `frontend.md` permite.
- Landing: el build falla si `PUBLIC_CONTACT_ENDPOINT` falta, no es `https` o su origen no está en `connect-src` de `security-headers.conf`. `astro dev` no lo exige.
- `docs/context/frontend.md` añade la regla de dependencias en una sola dirección y describe el refresh compartido; `docs/context/landing.md` y `docs/rules.md` documentan la comprobación del endpoint.

## Migration

- Un build local de la landing necesita `PUBLIC_CONTACT_ENDPOINT` en el entorno o en `apps/landing/.env`.

## Files of interest

- `apps/web/src/app/core/interceptors/error.interceptor.ts`
- `apps/web/src/app/core/services/auth.ts`
- `apps/web/src/app/core/services/follow-requests.ts`
- `apps/landing/contact-endpoint-check.mjs`

## Commits

- `0ccb257d` — fix(web): share the token refresh so cancelled requests no longer hang the rest
- `d2f022bc` — fix(web): derive isLoggedIn from a token signal instead of reading storage
- `c4734882` — fix(web): reset follow requests when the signed in account changes
- `015ba169` — refactor(web): move cross feature services and components to core and shared to break import cycles
- `147299b1` — build(landing): fail the build when the contact endpoint is missing or outside the csp
- `9abfdee7` — docs: document the shared token refresh, frontend dependency direction and contact endpoint check
- `878b0b89` — refactor(web): move the reviews service to core to break the backlog and games cycle
