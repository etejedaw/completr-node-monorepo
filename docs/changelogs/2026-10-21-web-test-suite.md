# Suite de tests del frontend

**Released:** 2026-10-21

## Summary

El frontend pasa de 8 specs a una suite de Vitest (vía `@angular/build:unit-test`) en dos niveles: specs de services, guards, interceptors, utils y componentes, y tests de interacción con Angular Testing Library que simulan lo que hace un usuario en una pantalla. La API se simula con `HttpTestingController` respondiendo como la API real, y las consultas se hacen por rol y nombre accesible.

## Highlights

- Specs de todos los services HTTP con `HttpTestingController`, de los guards de rutas y de los interceptors de auth y errores.
- Tests de interacción de login, My Games, listas, ficha de juego, Up Next y Want to Get, con varios pasos encadenados y verificación de lo visible y de lo que recibe la API.
- `npm run test:web` desde la raíz corre la suite sin watch.

## Added

- Specs de services de core y features, guards, `authInterceptor`, `errorInterceptor`, utils compartidos y componentes (`StarRating`, `ChipGroup`, `RatioSummary`, `BacklogStatusPills`, `ListCard`, `BacklogTable`, `StatusBreakdown`, `GameLibraryActions`).
- Specs `*.interaction.spec.ts` junto a cada pantalla cubierta.
- Dependencias de desarrollo `@testing-library/angular`, `@testing-library/dom`, `@testing-library/user-event` y `@testing-library/jest-dom`.

## Changed

- `docs/context/frontend.md` documenta los patrones de tests: services con `HttpTestingController`, API simulada con estado, toasts con Undo y stubs de jsdom.

## Files of interest

- `apps/web/src/app/core/interceptors/*.spec.ts`, `apps/web/src/app/core/guards/guards.spec.ts`
- `apps/web/src/app/features/**/*.interaction.spec.ts`
- `docs/context/frontend.md`

## Commits

- `236a6bd2` — test(web): add specs for core http services and storage
- `fa6e5b49` — test(web): add specs for auth and error interceptors
- `f45e8baf` — test(web): add specs for route guards
- `27fe340a` — test(web): add specs for admin and public profile services
- `48858094` — test(web): add specs for backlog, games, reviews and lists services
- `3ba2c155` — test(web): add specs for queue, wishlist, favorites and game shelf services
- `7d13a4c5` — test(web): add specs for progress, coop, franchises, feed, mood tags and profile services
- `d80a83d7` — test(web): add spec for public collection helper
- `1f462abc` — test(web): add specs for shared and core utils
- `83397662` — test(web): add specs for star rating, chip group, ratio summary and status pills
- `ed1c393a` — test(web): add specs for list card, backlog table, status breakdown and library actions
- `22f896bb` — docs(web): document frontend testing patterns
- `49a64250` — chore(web): add testing library and user-event dev dependencies
- `a1a51417` — test(auth): add login interaction spec
- `f1001f04` — test(backlog): add my games interaction spec
- `52d6a085` — test(lists): add lists interaction spec
- `fe60bcd9` — test(games): add game detail interaction spec
- `7858e180` — test(queue): add up next interaction spec
- `626d0bdc` — test(wishlist): add want to get interaction spec
- `91f39e18` — docs(web): document interaction testing patterns
