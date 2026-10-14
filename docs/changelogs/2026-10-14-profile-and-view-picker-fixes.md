# Fondo del hero del perfil y vista activa en el selector

**Released:** 2026-10-14

## Summary

Arreglos del perfil público y de My Games. El fondo del hero del perfil se resolvía después del primer pintado y cambiaba de imagen a la vista del usuario; ahora se calcula en la página antes de pintar, aparece con un fundido cuando la imagen termina de cargar y vuelve a tomar el favorito #1. En My Games, una vista guardada activa que no está fijada no aparecía en el selector View.

## Fixed

- `public-profile` calcula el fondo del hero antes del primer pintado; `profile-up-next` deja de resolverlo.
- El fondo vuelve a ser el favorito #1 y no el primer juego de Up Next.
- `profile-hero` muestra el fondo con un fundido al terminar de cargar la imagen.
- `backlog-list`: el selector View incluye la vista activa aunque no esté fijada.

## Files of interest

- `apps/web/src/app/features/public-profile/public-profile.ts`
- `apps/web/src/app/features/public-profile/components/profile-hero.html`
- `apps/web/src/app/features/backlog/backlog-list/backlog-list.ts`

## Commits

- `9c0d3d7b` — style(public-profile): fade in hero backdrop once the image loads
- `424aec60` — fix(public-profile): resolve hero backdrop from up next before first paint
- `e50222cd` — fix(public-profile): keep first favorite as hero backdrop instead of up next
- `f6373c0e` — fix(backlog): show active unpinned saved view in the view picker
