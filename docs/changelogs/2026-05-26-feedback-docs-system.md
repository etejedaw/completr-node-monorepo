# Sistema de documentación de feedback

**Released:** 2026-05-26

## Summary

Formaliza cómo se documenta el feedback de beta testers. Antes el feedback vivía suelto en TODO.md o en hilos de chat — ahora vive en `docs/feedback/fase-N.md` con IDs estables (`FB-NNN`), formato consistente y reglas editoriales en su propio `CONTEXT.md`. Recupera el archivo `fase-2.md` que se había perdido y unifica el formato de `fase-3.md` con FB-013 a FB-017. La convención ahora la usan los commits, PRs y los nuevos changelogs.

## Highlights

- `docs/feedback/CONTEXT.md` con la convención completa: estados (pendiente/resuelto/descartado/diferido), severidades, reglas editoriales, ejemplos.
- `docs/feedback/fase-2.md` restaurado (917 líneas de feedback recopilado durante Fase 2 y 2.5).
- Formato de `docs/feedback/fase-3.md` unificado con la convención + FB-013 a FB-017 agregados.
- IDs `FB-NNN` referenciables desde commits/PRs/changelogs.

## Added

- **`docs/feedback/CONTEXT.md`:** convenciones, estados, severidades, ejemplos completos.
- **`docs/feedback/fase-2.md`:** archivo histórico restaurado.

## Changed

- **`docs/feedback/fase-3.md`:** formato unificado con la convención, FB-013 a FB-017 agregados.

## Files of interest

- `docs/feedback/CONTEXT.md` — convención completa.
- `docs/feedback/fase-2.md`, `docs/feedback/fase-3.md`.

## Commits

- `c20ca83` — docs(feedback): restore fase-2 feedback file
- `88e1bbf` — docs(feedback): add CONTEXT.md with format conventions
- `6ffa5a8` — docs(feedback): unify fase-3 format and add FB-013 to FB-017
