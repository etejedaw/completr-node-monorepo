# Descubrir usuarios con tarjetas

**Released:** 2026-10-12

## Summary

La página de descubrir usuarios muestra tarjetas con datos del perfil en lugar de una lista simple. La API de discover y de búsqueda de usuarios pasa a devolver "insights" por usuario, calculados en `users-profile.service` respetando la privacidad: los contadores son `null` cuando el perfil no es visible para quien consulta.

## Highlights

- Tarjeta de usuario con seguidores, juegos, completados y juego destacado.
- Respuestas de `discover` y `search` con los mismos insights.
- Los datos privados no se filtran: los contadores salen en `null` si el perfil no es visible.

## Added

- `usersProfileService.buildUserCards` y `userCardSerializer`.
- Interfaz `UserCardInsights`: `isSelf`, `profileVisible`, `followerCount`, `isFollowing`, `gamesTotal`, `completedTotal` y `featuredGame`.
- Frontend: `users-discover/user-card`.

## Changed

- `users-discover` renderiza con tarjetas.
- Colección Bruno actualizada: `users/discover` y `users/search`.

## Files of interest

- `apps/api/src/users/users-profile.service.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.serializer.ts`
- `apps/web/src/app/features/users-discover/`

## Commits

- `14d5a961` — feat(users): return card insights in discover and search results
- `33be7597` — feat(users): add user card component with discover insights
- `78685d26` — feat(users): render discover page with user cards
