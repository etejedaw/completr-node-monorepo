# Auditoría de arquitectura de la API

**Released:** 2026-11-15

## Summary

Auditoría y corrección de la API módulo por módulo contra `docs/architecture.md`, en cuatro bloques: cuentas (`users`, `auth`, `activity`, `audit`, invitaciones, seguimiento, data-requests, `common`), catálogo (`games`, `jobs`, proveedores, géneros, plataformas, scores, times, reports), biblioteca (backlog, colas, listas, favoritos, reseñas, coop-runs, filtros guardados) y Rewind con acceso premium. La mayor parte son refactors sin cambio de comportamiento (separar services, serializers, constantes, interfaces y utils de una función por archivo). Además hay arreglos con cambio intencional de comportamiento, descritos abajo, y tests nuevos para cada uno.

## Refactors (sin cambio de comportamiento)

- `common/errors`: los normalizers de error se registran en tablas (`SERVICE_ERROR_NORMALIZERS` y `DOMAIN_ERROR_HTTP_MAPPERS` en `error-registry.ts`) con los helpers `buildHttpErrorMapper` y `buildErrorDomainNormalizer`. Un módulo nuevo agrega 2 imports y 2 líneas ahí; una clave sin registrar sigue cayendo en `INTERNAL_ERROR` 500.
- `common`: constantes de tiempo, configuración del correo de soporte y reutilización de los schemas de paginación.
- `users`, `auth`, `audit`, `activity`, `user-follow-requests`: serializers propios (`auditLogSerializer`, `sessionSerializer`, `incomingFollowRequestSerializer`), constantes de límites y de auditoría, `auth.router.ts` pasa a `auth.routes.ts`, y los favoritos destacados salen de `users` hacia el service de `favorites`. `activity` y `audit` ya no importan modelos ajenos.
- `games`, `wikidata`, `igdb`: services y utils partidos en un archivo por función, interfaces y constantes en sus archivos, una sola instancia de `RawgClient`, duplicados unificados y el módulo `games` sin modelos ajenos (`GameExternal` y `CompilationItem` van por sus services).
- `genres`, `game-scores`, `game-times`, `game-reports`, `score-sources`, `jobs`: serializers propios; `game-platinum` con queries tipadas y includes compartidos.
- `providers`: constantes, interfaces y helpers en archivos propios.
- `backlog`: el service se parte en `backlog-stats`, `backlog-profile`, `backlog-rewind` y `backlog-coop`; los helpers de `queue` pasan a `utils/`; includes de preview de listas y órdenes repetidos pasan a builders y constantes; `franchiseSerializer`; lecturas más eficientes (`DISTINCT ON` para el último progreso, elección aleatoria en SQL, conteo de juegos por franquicia).
- `games`, `platforms`, `users`, `list-items`: builders de `include` y `order` (`gameInclude`, `platformInclude`, `userInclude`, `listItemInclude`) para que los módulos no pivote no importen modelos ajenos.
- `reviews`: el service trabaja por `(userId, gameId)` y el controller ya no lanza `ServiceError`.
- `premium-access`, `rewind-editions`, `rewind`: services en `services/`, un schema por archivo, DTOs en `dtos/`, tipos en `*.interface.ts` y `*.types.ts`. `rewind.service.ts` baja de 926 a 505 líneas con `rewind-reservation.service.ts` y `rewind-ai-recap.service.ts`; `rewind-recap/utils/` queda con una función por archivo y `format-count` en tres utils.
- `rewind-share`: la búsqueda del invitado y `MISSING_REWIND_CODES` pasan del controller al service.
- Tests: los de ediciones del Rewind pasan a `test/rewind-editions/`, el helper `waitForMailTo` reutiliza `eventually` y `Account` se exporta desde `helpers/auth.helper.ts`.

## Fixed (cambio intencional de comportamiento)

- **403 → 404 en recursos ajenos.** Pedir por id un recurso de otro usuario responde 404, igual que uno inexistente, en backlog, backlog-progress, queue, game-shelf, saved-filters, coop-runs, lists, list-items, reviews y list-followers (listas privadas ajenas al seguir o duplicar). Desaparecen los códigos `*_FORBIDDEN` y `QUEUE_BACKLOG_NOT_OWNED`; aparecen `BACKLOG_NOT_FOUND`, `BACKLOG_PROGRESS_BACKLOG_NOT_FOUND`, `QUEUE_BACKLOG_NOT_FOUND`, `GAME_SHELF_NOT_FOUND`, `SAVED_FILTER_NOT_FOUND`, `COOP_BACKLOG_NOT_FOUND`, `LIST_NOT_FOUND`, `LIST_ITEM_LIST_NOT_FOUND`, `REVIEW_NOT_FOUND` y `LIST_FOLLOWER_LIST_NOT_FOUND`. `LIST_FOLLOWER_NOT_PUBLIC` queda solo para el dueño de la lista privada.
- **Auth antes del rate limiter.** En las rutas de todos los módulos, `authMiddleware`, `optionalAuth` o `hiddenRouteMiddleware` corren antes del rate limiter, de modo que la exención de admin y moderator funciona. Hay un test de orden (`route-middleware-order`). Además `/auth/logout` y `/auth/sessions*` ganan rate limit y la descarga de datos (`GET /users/me/data-requests/:id/download`) tiene un límite propio de 3 por 15 minutos por IP.
- **Login.** `POST /auth/login` compara el email en minúsculas y ya no valida la contraseña contra la política (cualquier cadena de 1 a 128 caracteres); la política sigue en registro, cambio y reset. `refresh` reclama el token de forma atómica (de dos refresh simultáneos solo uno responde 200) y el login de un email desconocido iguala el tiempo de respuesta. `PATCH /admin/users/:id` valida `password` con la política y rechaza campos desconocidos; `avatarUrl` pasa a ser una URL http(s) de hasta 255 caracteres.
- **Caída de la base en auth.** Un fallo de la base en el middleware de auth responde 500 en vez de 401, así la web ya no cierra la sesión.
- **Problem Details.** `DELETE /feed/:id` responde `ACTIVITY_NOT_FOUND`, `GET /changelog` y `GET /privacy` con la fuente caída responden 503 `COMMON_SOURCE_UNAVAILABLE`, un job desconocido responde 404 `JOB_NOT_FOUND` y un slug de RAWG mal formado responde 404 `RAWG_NOT_FOUND` sin llamar al proveedor. `DELETE /games/:id?hard=` y `POST /admin/jobs/populate-rawg?limit=` validan su query (422 `COMMON_SCHEMA_INVALID`). `/.well-known/security.txt` incluye `Expires`.
- **Locks y transacciones.** Los límites free y las posiciones se validan y escriben bajo advisory lock dentro de una transacción en wishlist (que además compacta posiciones al quitar), game-shelf, lists (crear y duplicar), saved-filters, list-items, queue, favorites, mood-tags y coop-runs (`FOR UPDATE`). El estado premium se resuelve antes de abrir la transacción para no agotar el pool. Otras operaciones concurrentes: aceptar una invitación (solo una de dos responde 201), aceptar una solicitud de seguimiento (un doble clic ya no duplica actividades), arrancar un job (lock `jobs:<tipo>`, el segundo inicio devuelve el job activo sin auditar) y editar o revocar un grant de premium (`FOR UPDATE`, con `now` tomado después del lock). Las escrituras de games, compilaciones y backlog usan transacciones gestionadas, y `saved-filters` crea, actualiza y reordena de forma atómica (`reorder` acepta subconjuntos).
- **El feed oculta listas que pasaron a privadas.** `GET /feed` y la actividad reciente del perfil dejan de mostrar actividades de una lista que ya no es pública, salvo a su dueño; las actividades se registran dentro de la transacción.
- **Actividad de reseñas.** `game_reviewed` solo se registra si cambian `content` o `rating`.
- **Serializers de scores, times y reports.** Las respuestas de `game-scores` y `game-times` salen de un serializer (`id`, `gameId`, `source`, `score` o `duration`, `updatedAt`) y dejan de filtrar otros campos del modelo; `game-reports` devuelve `category` y el resto de campos.
- **Presupuesto de 45 s de la IA.** `IaProvider.generateJson` comparte un presupuesto total (`JSON_TOTAL_BUDGET_MS`), recorta el `timeoutMs` de cada intento al tiempo restante y no reintenta con menos de 5 s.
- **Orden estable.** `GET /games` desempata por `id`, géneros y plataformas ordenan por `name, id`, y game-shelf pagina con orden determinista (más reciente primero).
- **Otros.** `rewind-share` solo descarga portadas por `https:` y corta la lectura al pasar el tope de bytes; las notificaciones de borrado de data-requests se envían después de que ocurre y el aviso al admin sale del camino de la respuesta; las escrituras de auditoría fallidas se registran en el log; el borrado de ítems de compilaciones declara su `CASCADE` en las asociaciones (`onDelete`).

## Changed

- Documentación: `docs/rules.md` documenta el orden auth → rate limiter, los locks por usuario o lista, el lock de jobs, el orden de duración canónica, las reglas de 404, el presupuesto de la IA y la excepción de módulos pivote; `docs/context/errors.md` apunta al registro de errores para dar de alta un módulo. Bruno: `jobs/cleanup-coop-runs.yml`, `coop-runs/get-candidates.yml`, `docs/api/rewind-editions/`, `audit-log`, y los `.yml` de `rewind-admin` y `premium-access` en kebab-case; 17 `.yml` actualizados de 403 a 404.

## Migration

- Sin migraciones: ningún cambio toca el esquema.
- Para la web: los códigos `*_FORBIDDEN` y `QUEUE_BACKLOG_NOT_OWNED` ya no existen; hay que manejar los `*_NOT_FOUND` nuevos listados arriba.

## Commits

- `6f442a83` — refactor(common): register error normalizers in a lookup table and add mapper builders
- `da1fb403` — refactor(common): add time constants, support email config and reuse the pagination schemas
- `4324044e` — refactor(users): derive visibility fields, extract limit constants and move featured favorites to its service
- `260d2bbe` — refactor(audit): extract the log serializer, filters and action constants
- `7cb8051e` — refactor(auth): extract session issuing, serializers and request user mapping
- `113541f4` — fix(auth): claim refresh tokens atomically and equalize login timing for unknown emails
- `d4e1d349` — fix(auth): validate login passwords without the policy and lowercase the email
- `cb3e7044` — fix(auth): stop turning database failures into invalid token responses
- `43baaace` — fix(api): authenticate before rate limiting and limit sessions, logout and data downloads
- `c4af821b` — fix(activity): hide activities of private lists, record them in a transaction and answer 404 as problem details
- `1224167e` — fix(audit): log failed audit writes and resolve the author without importing its model
- `c93c8684` — fix(users): edit accounts in one write, map update errors and bound avatar urls
- `aab57922` — fix(user-follow-requests): accept requests in a transaction and record activities once
- `37e3bc6a` — fix(data-requests): notify the deletion after it happens and keep the admin notice off the response path
- `ed6834e7` — fix(well-known): add an expiry date to security.txt
- `a0c2bd1f` — fix(common): answer unavailable json sources with problem details
- `1ac2e335` — test(helpers): reuse the eventually helper to wait for mail
- `e38f46e9` — docs(api): document the audit log endpoint
- `09378e8d` — fix(invitations): accept an invitation only once under concurrency
- `6d8b4dec` — refactor(providers): move provider constants, interfaces and helpers to their own files
- `973ef332` — refactor(catalog): serialize genres, scores, times, reports and score sources in their own serializers
- `1970508f` — refactor(game-platinum): type the platinum queries and move shared includes to constants
- `27292487` — refactor(games): split catalog services and utils, write in managed transactions and break ties by id
- `19e977e2` — fix(jobs): serialize job starts with an advisory lock and answer unknown jobs with problem details
- `bb379962` — fix(rawg): reject malformed slugs and unexpected search bodies before calling the provider
- `9a2572fe` — fix(catalog): run authentication before the rate limiter on catalog routes
- `2f19a545` — fix(catalog): order genres and platforms by name and map unique errors on platform updates
- `ea9a07f1` — fix(database): declare the cascade of compilation items in their associations
- `cdd6459f` — test(jobs): cover simultaneous starts, repeated cancellations and invalid limits
- `40329e9b` — test(games): cover stable pagination, delete query validation and catalog list order
- `18080e82` — test(games): cover atomic compilation writes and malformed rawg slugs
- `d9f1a2be` — docs(api): document job cancellation errors, delete query and the cleanup job
- `079393da` — refactor(api): add include builders to games, platforms and users services
- `865357e8` — refactor(backlog): split service into stats, profile, rewind and coop services
- `8a5073a8` — refactor(queue): move pure helpers into utils
- `33b16e03` — fix(api): run auth before the rate limiter on library routes
- `34d470ef` — fix(reviews): look reviews up by game and record activity only on change
- `58416cab` — fix(backlog): answer 404 for entries of other users and update under the queue lock
- `154ff4a7` — fix(backlog-progress): answer 404 for backlogs of other users and read latest notes in one query
- `350a5277` — fix(queue): serialize adds under the queue lock and answer 404 for other users' backlogs
- `97d242da` — fix(wishlist): serialize adds under a lock and compact positions on removal
- `35dc3563` — fix(favorites): lock the favorites while replacing them
- `360f1cba` — fix(game-shelf): paginate in a stable order and enforce the limit under a lock
- `9a236186` — fix(saved-filters): make create, update and reorder atomic and answer 404 for other users
- `243948ff` — fix(mood-tags): check the tag limit under a lock
- `b28c7675` — fix(lists): create and duplicate lists under a lock and answer 404 for lists of other users
- `97ac69af` — fix(list-items): add items under a list lock and answer 404 for lists of other users
- `f654ff06` — fix(list-followers): hide private lists on follow and serialize follower users
- `b54e463a` — fix(coop-runs): tag and remove members in locked transactions and answer 404 for other users
- `03b97915` — refactor(franchises): serialize franchises and count games in the service
- `f119309c` — docs(api): document 404 answers and the co-op candidates endpoint
- `6fb25fa3` — refactor(premium-access): move services into services/, split schemas and throw service errors
- `20f6c105` — fix(premium-access): lock a grant while editing or revoking it
- `c4bd210d` — fix(premium-access): authenticate before rate limiting premium routes
- `b555d3a0` — fix(rewind): authenticate before rate limiting rewind routes
- `414d1218` — fix(ia): cap json retries with a total time budget
- `38c9e738` — fix(rewind-share): fetch covers only over https with a streamed size cap
- `9319ac50` — refactor(rewind-recap): split utils into one function per file and extract constants
- `37955310` — refactor(rewind-share): move guest lookup into the service and split format utils
- `ec0aadb1` — refactor(rewind): split generation and recap services and move quota shift into the rewind service
- `de82c20e` — test(rewind-editions): move edition tests into their own folder
- `5b25d893` — test(premium-access): cover access flags in the gift offers list
- `6c923285` — docs(api): group edition endpoints and use kebab-case bruno names
- `a1e4108e` — test(lists): expect not found for foreign items and follows of private lists in the journey
- `977e3240` — docs(errors): point module registration to the error registry
- `bbbcd66b` — docs(rules): document audit rules for locks, not found, ai budget and pivot modules
