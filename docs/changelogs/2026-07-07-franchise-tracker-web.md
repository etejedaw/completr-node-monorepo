# Seguimiento de sagas (frontend)

**Released:** 2026-07-07

## Summary

Complemento de frontend de `2026-07-06-franchise-tracker.md`. Suma la página de cada saga con su progreso, el tab Sagas en el perfil, el seguimiento opcional y la gestión de sagas en el admin.

## Added

- Página `franchise-detail`, servicio `franchises` y badge de saga en `game-detail`.
- Toggle de seguimiento de la saga, con el panel de progreso compartido.
- Sección de sagas en el perfil público, luego movida a un tab propio.
- `admin-franchises` para crear sagas y asignarlas a juegos, también desde `admin-game-editor`.
- Modal de crear y editar saga con gestión de sus juegos.

## Files of interest

- `apps/web/src/app/features/franchises/franchise-detail/franchise-detail.ts`
- `apps/web/src/app/features/admin/admin-franchise-modal/admin-franchise-modal.ts`

## Commits

- `df8428cb` — feat(franchises): add franchise page, service and game-detail badge
- `685d3abd` — feat(public-profile): add sagas section with franchise progress
- `b6381412` — feat(admin): manage franchises and assign them to games
- `0c1cb692` — feat(franchises): add tracking toggle and reuse shared progress panel
- `a054893e` — feat(public-profile): move sagas into its own tab
- `fe2778c8` — feat(admin-franchises): manage games from create/edit modal
