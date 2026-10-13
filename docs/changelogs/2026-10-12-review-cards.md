# Tarjeta de reseña unificada

**Released:** 2026-10-12

## Summary

Las reseñas de usuario ahora exponen la portada del juego en la API y la web las renderiza con un único componente compartido, `review-card`, en el perfil público y en su página de reseñas. La tarjeta unifica el layout de todas las vistas. En el perfil, la muestra de reseñas prioriza las escritas, y la página de colección suma un esqueleto de filas.

## Added

- Componente compartido `review-card` (`shared/components/review-card/`).
- Artwork del juego en las reseñas de usuario (`reviews` en `apps/api/src/reviews`: `review.model`, `reviews.serializer`, `reviews.service`), documentado en `docs/api/users/get-user-reviews.yml`.
- Tipado del artwork en `public-reviews.service` y esqueleto de filas en `profile-collection-page`.

## Changed

- `user-reviews` y `profile-reviews` renderizan con `review-card`.
- La muestra de reseñas del perfil muestra primero las que tienen texto.
- `review-card` unifica su layout en una sola variante.

## Files of interest

- `apps/web/src/app/shared/components/review-card/review-card.ts` — tarjeta compartida.
- `apps/api/src/reviews/reviews.serializer.ts` — serialización del artwork.
- `apps/web/src/app/features/public-profile/user-reviews/user-reviews.ts` — página de reseñas.

## Commits

- `e7562b71` — feat(reviews): expose game artwork in user reviews
- `b58c8bac` — docs(api): document game artwork in user reviews
- `86c234bf` — feat(shared): add review card component
- `d337b5e5` — feat(profile): type game artwork on review entries
- `6c58bf4a` — feat(profile): add rows skeleton to collection page
- `ae789e56` — refactor(profile): show written reviews first in profile sample
- `651f43bc` — refactor(profile): render profile reviews with review card
- `127b5e92` — refactor(profile): render reviews page with review card
- `a2dba787` — refactor(web): unify review cards into a single layout
