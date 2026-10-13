# Rediseño de ajustes

**Released:** 2026-10-12

## Summary

Los ajustes se reorganizan sobre un conjunto de componentes propios (`settings-panel`, `settings-row`, `settings-nav`, `settings-save-bar`) y un shell con hero y navegación. Es solo frontend. Se rediseñan las secciones Appearance, Profile, Privacy y Security. Privacy gana niveles por sección y Security muestra las reglas de contraseña y las sesiones por dispositivo.

## Highlights

- Shell con hero y navegación entre secciones.
- Privacy con niveles por sección e iconos en cada fila.
- Security con reglas de contraseña (`password-policy`) y sesiones por dispositivo.
- Controles con tamaño táctil: input con altura mínima, switch con etiqueta aria y segmented control con icono y pista.

## Added

- `settings/components/`: `settings-nav`, `settings-panel`, `settings-row`, `settings-save-bar`.
- `settings/settings-sections.ts`, `settings-privacy/privacy-options.ts` y `settings-security/session-device.ts`.
- `core/utils/password-policy.ts`.
- `ui-switch`: input de etiqueta aria.
- `segmented-control`: icono y pista por opción.

## Changed

- `settings-shell`, `settings-appearance`, `settings-profile`, `settings-privacy` y `settings-security` se rediseñan con los componentes nuevos.
- Los inputs tienen altura mínima de tamaño táctil (`styles/ui.css`).

## Files of interest

- `apps/web/src/app/features/settings/components/`
- `apps/web/src/app/features/settings/settings-privacy/privacy-options.ts`
- `apps/web/src/app/features/settings/settings-security/`
- `apps/web/src/app/core/utils/password-policy.ts`

## Commits

- `c1198f6f` — feat(settings): add shared panel, row, nav and save bar components
- `ad20d307` — feat(settings): redesign settings shell with hero and nav
- `f092a054` — feat(settings): redesign appearance section
- `ae97013a` — feat(settings): redesign profile section
- `224b4faa` — feat(settings): redesign privacy section with per-section levels
- `4806c43e` — feat(settings): redesign security section with password rules and sessions
- `887dd392` — feat(settings): show section icons in privacy rows
- `9e7e737d` — style(shared): raise input min height to touch target size
- `73abd1dc` — feat(shared): add aria label input to switch
- `a07b668f` — feat(shared): add icon and hint to segmented control options
