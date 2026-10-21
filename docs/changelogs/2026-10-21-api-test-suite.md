# Suite de tests de la API

**Released:** 2026-10-21

## Summary

La API pasa de no tener tests a una suite con `node:test` nativo en tres niveles: unitarios sin base de datos, tests de integración por endpoint contra PostgreSQL y recorridos que simulan los pasos de un usuario real. Para poder testear la app en proceso, `server.ts` expone `createApp()` sin `listen`, y el entorno `test` desactiva el rate limiting, usa una base propia y reemplaza el envío de mails por un proveedor en memoria. Se eligió el runner nativo de Node con `ts-node` para no sumar un framework de tests al backend.

## Highlights

- `npm test` en la raíz corre la API y la web; `test:api`, `test:unit` y `test:integration` permiten correr cada parte.
- Tests de integración en proceso con supertest sobre `createApp()`, con migraciones aplicadas en un global setup y `TRUNCATE` entre archivos.
- Recorridos de usuario en `test/journeys/`: biblioteca, listas, wishlist y favoritos, social y privacidad, cuenta y sesiones.
- Cobertura de integración para auth, sesiones, listas, list-items, game-shelf, backlog, queue, wishlist, favorites, mood-tags, franchises, reviews, followers, follow-requests, saved-filters y coop-runs.

## Added

- `createApp()` en `apps/api/src/server.ts`; el `listen` y el aviso de RAWG pasan a `apps/api/src/app.ts`.
- Entorno `test`: `completr_test` en el puerto 5433 por defecto (sobrescribible con `PG_*` y `.env.test.local`), entorno `test` en `database.migrate.js`, rate limiter pass-through e `InMemoryMailProvider` en `apps/api/src/mail/mail.provider.ts`.
- Scripts `test`, `test:unit` y `test:integration` en `apps/api/package.json`, y `test`, `test:api` y `test:web` en la raíz. Dependencias de desarrollo `supertest` y `@types/supertest`.
- `apps/api/test/global-setup.mjs` y helpers en `apps/api/test/helpers/`: cliente supertest, truncado de tablas, factories, sesiones, outbox de mails y `eventually` para efectos en segundo plano.
- Helpers unitarios en `apps/api/test/unit-helpers/` para mockear modelos de Sequelize con `mock.method`.
- Tests unitarios (`*.unit.test.ts`) de los 17 serializers, cálculo de ratio, utils, schemas, sistema de errores y services con reglas de negocio.
- Tests de integración (`*.integration.test.ts`) por módulo y recorridos en `test/journeys/`.
- `apps/api/tsconfig.build.json`, que deja `test/` fuera del build.

## Changed

- `eslint.config.mjs` incluye `apps/api/test/**` en el bloque type-aware de la API; los `describe` e `it` de `node:test` llevan `void` por `no-floating-promises`.
- `apps/api/tsconfig.json` incluye `test` y los tipos de Node.

## Files of interest

- `apps/api/src/server.ts`, `apps/api/src/app.ts`
- `apps/api/src/mail/mail.provider.ts`, `apps/api/src/common/middlewares/rate-limiter.middleware.ts`
- `apps/api/test/global-setup.mjs`, `apps/api/test/helpers/`, `apps/api/test/journeys/`
- `docs/context/conventions.md` (sección de tests de la API), `docs/architecture.md`

## Commits

- `5b152db5` — refactor(api): split app creation from server listen
- `18db91a8` — feat(api): add test database environment
- `4203920e` — feat(api): skip rate limiting in test environment
- `5fe4a486` — feat(mail): add in-memory mail provider for test environment
- `81607145` — build(api): add node test runner scripts and supertest
- `8f334dff` — build(repo): run api and web tests from the root
- `b4dd9899` — chore(repo): lint api tests with type-aware rules
- `e158ee26` — test(api): add integration global setup and helpers
- `d2f3f296` — test(auth): add auth integration tests
- `37d9d689` — test(lists): add lists integration tests
- `2a946734` — test(game-shelf): add game shelf integration tests
- `d00da6f8` — test(backlog): add backlog integration tests
- `19c89452` — docs(api): document api tests and app creation
- `5b865c34` — docs(claude): add test commands to root scripts list
- `067b92bf` — test(api): add shared unit test helpers
- `3882a835` — test(common): add unit tests for utils, schemas and error handling
- `841fcebd` — test(backlog): add unit tests for schemas, utils, serializer and service
- `c8f3ffb0` — test(auth): add unit tests for schemas, utils, token and auth services
- `d7b69430` — test(games): add unit tests for serializer and query utils
- `41e5bf50` — test(users): add unit tests for serializer and visibility helpers
- `9601a850` — test(mood-tags): add unit tests for tag normalization and service
- `858a6964` — test(lists): add unit tests for serializer and service
- `349518c6` — test(list-items): add unit tests for service
- `baf1f011` — test(game-shelf): add unit tests for serializers and service
- `34602f23` — test(queue): add unit tests for serializer and service
- `866a0da5` — test(wishlist): add unit tests for serializer and service
- `165d5351` — test(favorites): add unit tests for serializer and service
- `5a4072e5` — test(franchises): add unit tests for service
- `4be9300d` — test(api): add unit tests for activity, reviews, invitations, saved filters, backlog progress and platform serializers
- `092c751a` — test(auth): cover password reset with the in-memory mail provider
- `b23ab3c2` — test(api): lint unit tests with type-aware rules
- `7bf10e6d` — test(api): add eventually helper and factories for franchises, saved filters and wishlist
- `6e8e32a9` — test(api): add library journey covering shelf, backlog, queue and replays
- `b6127e66` — test(api): add lists journey covering sharing, following and duplication
- `ceb051db` — test(api): add wishlist and favorites journey
- `a9a809d9` — test(api): add social and privacy journey covering follows, requests and feed
- `c92b9e33` — test(api): add account journey covering invitation, sessions and passwords
- `accbe32f` — test(queue): add integration tests
- `8403dfae` — test(wishlist): add integration tests
- `157def9b` — test(favorites): add integration tests
- `4f4c88d7` — test(mood-tags): add integration tests
- `7a6af8c8` — test(franchises): add integration tests
- `fdb9f351` — test(reviews): add integration tests
- `822dc307` — test(user-followers): add integration tests
- `b06fdc26` — test(user-follow-requests): add integration tests
- `1783abee` — test(saved-filters): add integration tests
- `56844e0a` — test(coop-runs): add integration tests
- `0e103806` — test(auth): add integration tests for sessions
- `28a110d2` — test(lists): add integration tests for official, recent and search
