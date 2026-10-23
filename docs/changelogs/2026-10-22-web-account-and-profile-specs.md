# Specs de cuenta, ajustes y perfil público

**Released:** 2026-10-22

## Summary

La suite del frontend suma specs para las pantallas de cuenta que solo se probaban de forma indirecta o no se probaban: privacidad, perfil público, flujos de auth y el resto de ajustes. Siguen los patrones de `docs/context/frontend.md`: la API se simula con `HttpTestingController` y las consultas se hacen por rol y nombre accesible. No hay cambios de código de la app.

## Highlights

- Privacidad de punta a punta en la interfaz: lo que configura el usuario en `settings-privacy` y lo que ve otro en su perfil según el acceso (propio, público, privado, seguidor, anónimo, inexistente).
- Flujos de cuenta: register, forgot-password, reset-password, accept-invite y la página de auth con su showcase.
- Ajustes de perfil, seguridad (contraseña y sesiones), apariencia, shell y componentes compartidos de settings.

## Added

- `settings/settings-privacy`: `privacy-options.spec.ts` y `settings-privacy.spec.ts`.
- `public-profile`: spec de la página, de sus componentes y de las subpáginas `user-*`, más `comparison-options.spec.ts`.
- `auth`: specs de interacción de register, forgot-password, reset-password y accept-invite, y specs de `auth-page`, `auth-showcase` y `showcase-games`.
- `settings`: specs de `settings-profile`, `settings-security`, `session-device`, `settings-appearance`, `settings-shell`, `settings-sections` y de `settings-nav`, `settings-panel`, `settings-row` y `settings-save-bar`.

## Files of interest

- `apps/web/src/app/features/public-profile/public-profile.spec.ts`
- `apps/web/src/app/features/settings/settings-privacy/settings-privacy.spec.ts`
- `apps/web/src/app/features/settings/settings-security/settings-security.spec.ts`

## Commits

- `1f724511` — test(web): add specs for privacy settings and options
- `45c0069c` — test(web): add specs for public profile page, components and subpages
- `6810e771` — test(web): add auth account flow specs
- `1c16849e` — test(web): add specs for account settings profile, security, appearance and shell
