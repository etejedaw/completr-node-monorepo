# Trazas de error, secretos de producción y arranque de la API

**Released:** 2026-11-15

## Summary

Endurecimiento de la infraestructura de `apps/api`: los errores que responde el handler dejan rastro en el log, la API se niega a arrancar en `prod` con secretos de desarrollo, el arranque y el cierre del proceso son explícitos, los modelos se registran en un solo sitio y el contenedor deja de correr como root.

## Highlights

- Un 500 en producción deja `correlationId`, código, causa y stack en el log.
- Un deploy sin `ACCESS_TOKEN_SECRET` ya no arranca con el secreto por defecto.

## Added

- `errorHandlerMiddleware` loguea con `PinoLogger("ErrorHandler")`: los 5xx en `error` con el stack de la causa original; los 4xx en `warn`, salvo 401, 403, 404 y 429. Nunca registra el body, las cabeceras ni el query string.
- `database/models.database.ts`: registro único de los 47 modelos, con un test que lo compara contra los `*.model.ts` de `src`.
- `apps/api/Dockerfile`: `USER node`, directorio `logs` con su dueño y `HEALTHCHECK` contra `GET /robots.txt`.

## Changed

- En `NODE_ENV=prod`, `environment.config.ts` exige `ACCESS_TOKEN_SECRET` de al menos 32 caracteres y `COOKIE_SECURE=true`, y `database.config.ts` exige un `PG_PASSWORD` definido y distinto del de desarrollo. En `dev` y `test` los valores por defecto no cambian.
- `app.ts`: un fallo de `bootstrap` se loguea y sale con código 1; el cierre por `SIGTERM` o `SIGINT` cierra el pool de Sequelize antes de salir.
- `docs/context/errors.md`, `docs/context/modules.md`, `docs/architecture.md`, `docs/rules.md` y `README.md` documentan el criterio de log, el registro de modelos, las variables exigidas y el usuario del contenedor.

## Removed

- Exports sin uso: `findCoopBacklogsOfUsersForGame`, `findReviewsByUserId`, `canViewList`, `gameForbidden`, `sourceGameMismatchError`, `sourceBacklogMismatchError`, `notAcceptingRequestsError` y los tipos `SortOrder`, `StatKey`, `SavedFilterIcon` y `SavedFilterColor`, con los mapeos que quedaban huérfanos (`GAME_FORBIDDEN`, `QUEUE_SOURCE_GAME_MISMATCH`, `QUEUE_SOURCE_BACKLOG_MISMATCH`, `USER_FOLLOW_REQUEST_NOT_ACCEPTING`).

## Migration

- Antes de desplegar: `ACCESS_TOKEN_SECRET` (32 caracteres o más), `COOKIE_SECURE=true` y un `PG_PASSWORD` propio. Cambiar el secreto invalida los access tokens vigentes.
- El contenedor escribe como `node` (uid 1000): si el volumen de `logs` tiene archivos de root, hay que cambiarles el dueño una vez.

## Files of interest

- `apps/api/src/common/middlewares/error-handler.middleware.ts`
- `apps/api/src/common/config/environment.config.ts`
- `apps/api/src/database/models.database.ts`
- `apps/api/src/app.ts`
- `apps/api/Dockerfile`

## Commits

- `19f798bc` — feat(api): log handled errors in the error handler middleware
- `5bcc383b` — fix(api): require strong secrets and secure cookies in prod
- `80935e90` — refactor(api): register models from a single tested list
- `3ada1b0c` — fix(api): exit on bootstrap failure and close the pool on shutdown
- `3b9e3032` — refactor(api): remove unused exports and their orphaned error mappings
- `ba8eecc6` — build(api): run the container as node with a healthcheck
