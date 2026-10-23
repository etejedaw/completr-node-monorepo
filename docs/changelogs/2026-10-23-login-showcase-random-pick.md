# Showcase del login con muestra al azar

**Released:** 2026-10-23

## Summary

`GET /games/showcase` devolvía siempre los 21 juegos más populares y elegía como destacado el de mejor ratio, así que el login mostraba siempre el mismo juego. Ahora la API toma una muestra al azar de 21 dentro de los 80 más populares y entrega por cada juego el año, los géneros, el score, las horas y el ratio. El cliente elige el destacado al azar entre los que tienen ratio. La respuesta deja de incluir `featured`, así que la API y el web se despliegan juntos.

## Highlights

- El fondo del login cambia cada vez que se renueva la caché de 30 minutos, y el destacado cambia en cada visita.
- La tarjeta destacada muestra el año y hasta dos géneros, y enlaza a la ficha del juego después de iniciar sesión.

## Changed

- `games-showcase.service`: el pool sube a 80 juegos (`SHOWCASE_POOL_SIZE`) y `sampleShowcaseGames` toma 21 con un Fisher-Yates parcial. La muestra es lo que se cachea.
- La consulta del showcase suma `releaseYear` (de `releaseAt`) y `genres` (nombres en orden alfabético, vía `GameGenres`) en el mismo SQL.
- `gameShowcaseSerializer`: cada juego trae `releaseYear`, `genres`, `score`, `hours` y `ratio`, que es `null` si falta el score o la duración.
- `auth-showcase`: el destacado sale al azar de los juegos con ratio, con una sola tirada por instancia. La etiqueta pasa de "Up next · #1" a "Featured pick". La tarjeta es un enlace a `/login?returnUrl=/games/<code>`. El fallback sin datos de catálogo no enlaza.
- `docs/invariants.md` y `docs/api/games/showcase.yml` describen el pool, la muestra y los campos nuevos.

## Removed

- `featured` de la respuesta de `GET /games/showcase` y el tipo `FeaturedShowcaseGame` del web.

## Files of interest

- `apps/api/src/games/services/games-showcase.service.ts`
- `apps/api/src/games/games.serializer.ts`
- `apps/web/src/app/features/auth/auth-showcase/auth-showcase.ts`

## Commits

- `b206124d` — feat(games): sample the showcase from the 80 most popular games with year, genres and ratio per game
- `104bbeff` — docs(games): document the sampled showcase and its per-game catalog data
- `d2485f0c` — feat(web): feature a random rated showcase game on the login with its details and link
