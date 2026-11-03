# Admin: del panel de usuarios al perfil y premium desde el perfil

**Released:** 2026-11-02

## Summary

El panel `/admin/users` no tenía forma de abrir el perfil público de una cuenta, y el modal de acceso premium solo se podía abrir desde ese panel. Esta entrega enlaza cada usuario con `/user/:username` y agrega al perfil público, para un admin que mira la cuenta de otra persona, un botón que abre el mismo modal `AdminPremiumAccess` para gestionar el premium completo y las features individuales.

## Added

- `admin-users`: el username de la tabla de escritorio es un enlace a `/user/:username` que no abre el diálogo de edición; en móvil, cada fila tiene un enlace con icono `account_circle`.
- `admin-users`: enlace "View profile" en el pie del diálogo "Edit user".
- `admin-users`: botón de edición con `aria-label` "Edit {username}" en una columna "Actions" de la tabla, que reemplaza al botón del username como control de teclado para abrir la edición.
- `public-profile`: `canManagePremium` (viewer admin, perfil ajeno y rol sin premium según `isPremiumRole`) y el botón "Premium access" en `ProfileHero` y en el estado de perfil privado.
- `public-profile`: al cerrar el modal se vuelve a pedir el perfil y se actualiza solo `user.hasPremium`, así el aro del avatar refleja el cambio sin recargar la vista.
- Tests de `AdminUsers` (enlace al perfil, enlace del diálogo) y de `ProfileHero` (visibilidad del botón y doble clic).

## Changed

- `AdminPremiumAccess` recibe `Pick<AdminUser, "id" | "username">` en lugar de `AdminUser`, para poder abrirlo con el usuario del perfil público.

## Files of interest

- `apps/web/src/app/features/admin/admin-users/admin-users.html`
- `apps/web/src/app/features/admin/admin-premium-access/admin-premium-access.ts`
- `apps/web/src/app/features/public-profile/public-profile.ts`
- `apps/web/src/app/features/public-profile/components/profile-hero.html`

## Commits

- `15e3d6a5` — feat(admin): link each user to their public profile from the users panel
- `bb73ce52` — feat(public-profile): let admins manage premium access from a user profile
