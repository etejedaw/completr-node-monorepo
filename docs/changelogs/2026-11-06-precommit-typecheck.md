# Typecheck de las tres apps en el pre-commit

**Released:** 2026-11-06

## Summary

El hook de pre-commit solo corría `lint-staged` (ESLint y Prettier sobre los archivos en stage), así que un error de tipos que ESLint no detecta llegaba al commit. Ahora el hook corre además el `typecheck` de la raíz, que cubre las tres apps. `apps/web` no tenía script de typecheck: un `tsc --noEmit` no revisa las plantillas y `ng build` genera el build, así que se usa `ngc --noEmit`, que revisa tipos y plantillas sin escribir archivos.

## Added

- `apps/web/package.json`: script `typecheck` con `ngc -p tsconfig.app.json --noEmit` y `ngc -p tsconfig.spec.json --noEmit`.

## Changed

- `package.json`: el `typecheck` de la raíz incluye `apps/web` además de `apps/api` y `apps/landing` (`astro check`).
- `.husky/pre-commit`: corre `npm run typecheck` después de `lint-staged`; si falla, el commit no se crea. Suma unos 13 segundos por commit.

## Files of interest

- `.husky/pre-commit`
- `apps/web/package.json`

## Commits

- `29bece68` — build(web): add typecheck script that checks templates with ngc
- `25cb3d8b` — build(repo): typecheck all apps in the pre-commit hook
