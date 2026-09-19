# Angular 22.1 y Signal Forms en admin-users

**Released:** 2026-09-09

## Summary

Continuación de `2026-07-06-frontend-angular-22-signal-forms.md`. El frontend sube a Angular 22.1 y actualiza dependencias transitivas para limpiar `npm audit`. Los formularios de crear y editar usuarios del admin, que habían quedado fuera de la migración, pasan a Signal Forms.

## Changed

- Angular 22.1 y dependencias transitivas actualizadas.
- `package.json` del frontend deniega los scripts de instalación de dependencias nativas que ya vienen precompiladas.
- `admin-users` valida los formularios de crear y editar con Signal Forms.

## Files of interest

- `apps/web/src/app/features/admin/admin-users/admin-users.ts`
- `apps/web/package.json`

## Commits

- `ed9f4071` — chore(deps): update angular to 22.1 and transitive deps to clear npm audit
- `2ada00f6` — chore(npm): deny install scripts for prebuilt native deps
- `8a2992ac` — feat(admin-users): validate create and edit forms with signal forms
