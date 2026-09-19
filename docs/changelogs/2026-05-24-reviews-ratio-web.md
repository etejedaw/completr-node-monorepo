# Reviews en el backlog (frontend)

**Released:** 2026-05-24

## Summary

Complemento de frontend de `2026-05-24-post-v0.3.1-reviews-ratio.md`. El backlog ya recibe la review existente del usuario en cada entry, así que la UI deja de ofrecer escribir una segunda review sobre un juego que ya tiene una.

## Fixed

- `backlog-list`: el switch de review del cambio rápido de estado solo aparece cuando el juego aún no tiene review del usuario.
- `backlog-modal`: el formulario de review inline se oculta cuando el juego ya tiene review.

## Files of interest

- `apps/web/src/app/features/backlog/backlog-list/backlog-list.ts`
- `apps/web/src/app/features/backlog/backlog-modal/backlog-modal.ts`

## Commits

- `761b29b9` — fix(backlog): gate quick-status review switch on review presence
- `0c94754c` — fix(backlog): hide inline review form when game already has user review
