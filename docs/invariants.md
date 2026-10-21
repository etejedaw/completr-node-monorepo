# Invariantes

Lo que el código hace cumplir, en forma atómica: enums, constraints, validaciones, códigos de error, nombres de eventos y comportamientos automáticos.

**Este archivo describe el mecanismo, no la decisión de producto detrás.** Acá está cómo se llama cada enum, qué constraint existe y qué código de respuesta devuelve la API al violar una regla. El porqué de cada regla —cuánto obtiene cada tier, qué significa cada estado para el usuario— es planificación de producto y no se documenta en este repo.

Arquitectura en [`architecture.md`](./architecture.md), endpoints en [`api/`](./api/).

---

## Roles

Enum `User.role` en `apps/api/src/users/user-role.type.ts`: `user`, `premium`, `moderator`, `admin`. Default al registrarse: `user`.

- El gating premium se resuelve con `isPremium()`, que acepta `premium`, `moderator` y `admin`.
- Qué puede hacer cada rol se hace cumplir en `authMiddleware(...)` de cada `*.routes.ts`: esa es la fuente autoritativa de permisos.

---

## Límites por usuario

Los recursos con tope por rol son `lists`, `list-items`, `saved-filters`, `favorites`, `wishlist`, `queue`, `game-shelf` y `mood-tags`. Cada valor vive como constante en el service del módulo (`FREE_LIST_LIMIT`, `FREE_FAVORITE_LIMIT`, `FREE_WISHLIST_LIMIT`, `FREE_QUEUE_LIMIT`, `FREE_FILTER_LIMIT`, `FREE_SHELF_LIMIT`, `FREE_TAG_LIMIT`); no se replican acá para que no queden desfasados. El backlog no tiene tope.

- En `mood-tags` el tope cuenta nombres de tag distintos (los asignados a juegos más los creados sin juego). Solo se bloquea introducir un nombre nuevo: asignar, renombrar o borrar tags existentes sigue permitido aunque el usuario esté sobre el tope.
- Exceder el tope devuelve **`402`**, mapeado en el `domain-to-http.mapper.ts` de cada módulo.
- `lists`, `list-items` y `saved-filters` implementan además el estado **frozen**: estando sobre el tope, create y update lanzan `frozenError()`; delete sigue permitido y lo existente se sigue sirviendo. Nada se borra automáticamente.
- Los listados de `lists` y `saved-filters` devuelven un flag `frozen` en la respuesta para que el frontend lo refleje.

---

## Backlog

### Estados

Enum `Backlog.status`: `not_started`, `playing`, `completed`, `abandoned`, `endless`. Default al crear: `not_started`.

- `endless` se agrupa con `completed` y `abandoned` en los cálculos de progreso de franquicias y listas.
- En filtros por actividad, `endless` se trata como activo junto a `playing`: `finishedAt` se coalesce a `CURRENT_DATE`.

### Reglas

- Cada vez que el usuario quiere, inicia o reinicia un juego se crea un **nuevo** `Backlog`. No se reutilizan.
- El estado actual del usuario sobre un juego se deriva del backlog más reciente.
- `playCount` se calcula contando los backlogs del usuario sobre el juego.
- `userRating`: escala 0.5–5, paso de medio punto.
- `score` y `duration`: requeridos y positivos al crear, con máximo 2 decimales (con más responde 422, no se redondea). `score` va en escala 0–5 (máximo 5, validado en el schema); las notas de fuentes en otra escala se normalizan antes de enviarse.
- `realDuration`, `userRating`, `notes`, `startedAt`, `finishedAt`: nullable en update.
- `notes` se excluye de respuestas públicas siempre.
- Activity de cambio de status se emite solo cuando el status **realmente** cambia.

### Compilations

- `Backlog.compilationGameId` persiste el juego compilation al que pertenece la run.
- Se valida que el link child sea consistente con el `CompilationItem` correspondiente.

### Creación con extras

- `POST /users/me/backlog` acepta los opcionales `addToQueue`, `addToShelf`, `moodTags`, `review` y `progressNote`, y escribe el backlog y todos los extras en una sola transacción: si falla cualquier paso, no se crea nada y la respuesta lleva el error del módulo que falló (por ejemplo, 402 `QUEUE_LIMIT_REACHED`, 402 `GAME_SHELF_LIMIT_REACHED`, 402 `MOOD_TAGS_LIMIT_REACHED` o 409 `QUEUE_BACKLOG_NOT_STARTED`).
- `addToQueue` exige status `not_started`.
- `addToShelf` se omite sin error si el usuario ya tiene el juego en la estantería en la misma plataforma.
- `moodTags` reemplaza los tags del usuario para el juego; `[]` los borra.
- `review` solo se acepta con status `completed`, `abandoned` o `endless` (si no, 422 `COMMON_SCHEMA_INVALID`) y se omite sin error si el usuario ya tiene review del juego.
- Las activities (`backlog_added` y, si se crearon, `game_reviewed`, `queue_added` y `shelf_added`) se registran después del commit.

### Auto-comportamientos al cambiar status

- Pasar a `playing`, `completed`, `abandoned` o `endless` **elimina la entrada del queue** si existía.
- La respuesta de update incluye `queueRemoved: true` cuando aplica.

---

## Queue

- Solo acepta backlogs en estado `not_started`. Cualquier otro estado se rechaza al añadir.
- Auto-remove al cambiar el status del backlog asociado fuera de `not_started`.
- Auto-remove al borrar el backlog asociado (`ON DELETE CASCADE` en `Queues.backlogId`).
- Unique `(user_id, backlog_id)`.
- `position` sin huecos ni duplicados: toda salida de la queue (cambio de status fuera de `not_started`, borrado del backlog) renumera las restantes 1..n en la misma transacción, y el alta usa `MAX(position) + 1`. Las operaciones sobre la queue de un usuario se serializan con un advisory lock transaccional (`pg_advisory_xact_lock`).
- `GET /users/:username/queue` omite `backlog.notes` y `backlog.moodTags`, y excluye las entradas cuyo backlog es privado (`isPublic = false`); el filtro va en la consulta, así que `total` y la paginación cuentan solo lo visible. `position` se numera sobre lo visible (`offset + índice + 1`) para no revelar huecos; en la DB no cambia. La queue propia (`GET /users/me/queue`) devuelve todo y con su `position` real.

---

## Wishlist

- Apunta a `Game`. No requiere backlog previo.
- Trackea plataforma deseada por entry.
- Unique `(user_id, game_id)`.
- Emite activity `wishlist_added` al añadir.

---

## Favorites

- Apunta a `Game`. No requiere backlog.
- Unique `(user_id, game_id)`.

---

## Listas y list-items

- Pública o privada (`isPublic`).
- `scoreSource` y `durationSource` se declaran a nivel lista.
- Los `ListItem` **no permiten valores custom** de score/duration. Solo lo que provee la fuente declarada.
- `score`/`duration` se copian desde `GameScore`/`GameTime` al añadir.
- `ratio` por item: `score / duration`. `null` si la fuente no tiene el dato.
- Scores normalizados redondeados a 2 decimales.
- `realDuration` y `personalRatio` por item se calculan con sticky-best: se toma el mejor backlog del usuario sobre ese juego.
- `position` sin huecos y reordenable: quitar un item renumera los restantes 1..n en la misma transacción, conservando el orden. `(list_id, position)` tiene un índice no único, así que la unicidad la mantiene el service y no la base.
- Si el creador edita o refresca una lista, todos los seguidores ven los cambios.
- `GET /lists/:listId/followers` respeta la privacidad de la lista igual que `GET /lists/:id`: si la lista es privada y quien pide no es su dueño responde 404 `LIST_FOLLOWER_LIST_NOT_FOUND`, indistinguible de una lista inexistente. El dueño ve siempre sus seguidores.
- `GET /users/:username/following-lists` excluye las listas privadas que no pertenezcan a quien mira y los follows con `ListFollower.isVisible = false`; ambos filtros van en la consulta, así que `total` y la paginación cuentan solo lo visible.
- `GET /users/:username/lists/:listId` responde 404 `USER_NOT_FOUND` si la lista no pertenece a `:username`, y también si es privada y quien pide no es su dueño.
- Refrescar items reaplica score/duration desde la fuente declarada.
- `PUT /games/:gameId/lists` fija en una sola transacción el conjunto de listas propias que contienen el juego: añade el juego (al final, congelando score y duración de la fuente de cada lista) a las que faltan y lo quita de las propias que sobran (renumerando posiciones). Una lista ajena responde 403 `LIST_ITEM_FORBIDDEN`, una inexistente o un juego inexistente 404, y un free sobre el límite de listas recibe 402 `LIST_ITEM_FROZEN` solo si hay que añadir a alguna lista (quitar sigue permitido). Si algo falla no se aplica ningún cambio.
- `GET /lists/recent` y `GET /lists/official` aceptan `limit` entero entre 1 y 50 (por defecto 12); cualquier otro valor o parámetro desconocido responde 422 `COMMON_SCHEMA_INVALID`.

---

## Saved filters

- `isDefault`: solo una vista puede tenerlo en `true` por usuario. Setearla resetea las demás.
- `showInBacklog`: bandera para mostrar la vista en el listado lateral del backlog.
- Las vistas guardan filtros como JSONB; cualquier usuario puede construir la URL con query params equivalente y guardarla como bookmark del navegador.
- `filters` se valida al crear y al editar con `BacklogQuerySchema` (el mismo de `GET /users/me/backlog`); un valor inválido responde 422 `COMMON_SCHEMA_INVALID`.
- `GET /users/me/saved-filters/:filterId/stats` sobre un filtro que ya estaba guardado con filtros que hoy no pasan el schema responde 422 `SAVED_FILTER_VALIDATION_ERROR`.

---

## Co-op

- Etiquetar a un usuario que ya es miembro del run responde 422 `COOP_ALREADY_TAGGED`, con o sin `targetBacklogId`.
- `GET /users/me/backlog/:backlogId/coop` solo lo puede leer el dueño del backlog o un miembro de su run; cualquier otro recibe 403 `COOP_FORBIDDEN`. Un `backlogId` inexistente responde 404 `COOP_BACKLOG_NOT_FOUND`.

---

## Reviews

- Una review por `(user, game)`.
- Solo se cuentan en contadores las reviews con `content` no vacío. Las rating-only son visibles pero no suman al "reviews count".
- Activity `game_reviewed` se emite tanto en create como en edit.
- La review expone `playthroughDuration` derivada del último backlog completado del autor sobre el juego.

---

## Scores y duraciones

### Tres niveles

- **`GameScore` + `GameTime` (catálogo global):** un registro por `(game_id, source)`. Tablas separadas para evitar nulls; cada una con UUID propio. `GameScore` guarda la nota cruda en la escala de su fuente; `GameTime` guarda horas. Las fuentes de duración son un enum fijo (`TIME_SOURCES`: hltb, rawg, completr).
- **`GameShelf` (del usuario):** copia editable elegida por el usuario. Determina el ratio en su backlog.
- **`ListItem` (congelado en lista):** copiado desde la fuente declarada por la lista al añadir el juego. No editable manualmente — solo vía refresh o cambio de fuente.

`Game` no tiene `averageScore` ni `averagePlaytime`: los puntajes viven en `GameScore` y las duraciones en `GameTime`.

### Catálogo de fuentes de score

- Las fuentes de score son registros de `ScoreSources` (`code` único, `name`, `scale`, `priority`). No hay lista fija en el código: cualquier fuente creada con `POST /score-sources` se puede usar en `GameScore` y como `scoreSource` de una lista.
- `GameScores.source` y `Lists.scoreSource` tienen FK a `ScoreSources.code` con `ON UPDATE CASCADE` y `ON DELETE RESTRICT`: no se puede borrar una fuente en uso.
- Una fuente inexistente responde 422 (`GAME_SCORE_SOURCE_NOT_FOUND` en game-scores y games, `LIST_SCORE_SOURCE_NOT_FOUND` en lists).
- `scale` es el máximo de la fuente. Normalizar a 0–5: `score / scale * 5`, redondeado a 2 decimales.
- `priority` (menor gana, default 100) decide qué fuente manda cuando un juego tiene varias: orden canónico de `/games` y precarga del Critic Score en el modal del backlog.
- `completr` es la fuente propia del sistema (`COMPLETR_SCORE_SOURCE`): la escribe solo el job `calculate-ratings`; la API de carga manual la rechaza.
- La migración `change-score-sources-to-catalog` siembra completr (5), metacritic (100), opencritic (100) y rawg (5) sin pisar registros existentes.
- Al importar desde RAWG, las notas de fuentes que no están en el catálogo se omiten con un warning en el log; el juego se importa igual.

### Precarga al crear un backlog

- Score: precarga la nota de la fuente con menor `priority` que tenga el juego, normalizada a 0–5.
- Duration: precarga desde `GameTime.source = "hltb"` si existe.
- El usuario puede sobrescribir antes de guardar.

### Reemplazo en bloque

- `PUT /games/:gameId/scores` y `PUT /games/:gameId/times` reemplazan en una transacción el conjunto completo de scores manuales o duraciones manuales (`hltb`, `rawg`) de un juego: upsert de lo enviado y borrado de lo que no viene. La fuente calculada `completr` nunca se envía ni se borra. Juego inexistente responde 404 `GAME_SCORE_GAME_NOT_FOUND` o `GAME_TIME_GAME_NOT_FOUND`; una fuente de score fuera del catálogo, 422 `GAME_SCORE_SOURCE_NOT_FOUND`. Si algo falla no se aplica nada.

### Sagas

- `POST /franchises` y `PATCH /franchises/:id` aceptan `gameIds` opcional: el conjunto final de juegos de la saga. Si se envía, la saga y los vínculos se aplican en una sola transacción: los juegos listados quedan con ese `franchiseId` y los que la saga tenía y no aparecen se desvinculan (`franchiseId = null`). Si algún id no existe responde 404 `FRANCHISE_GAMES_NOT_FOUND` y no se aplica nada. Sin `gameIds` los juegos no se tocan.

### Datos crudos

- RAWG rating se almacena en escala 0–5; no se normaliza al persistir.
- La normalización a escala 100 ocurre al calcular ratios.

### Jobs de actualización masiva

- Solo `admin` puede dispararlos.
- `calculate-ratings` y `calculate-durations` exigen mínimo del **10% de usuarios** con dato para emitir score Completr.

---

## Ratio

Fórmulas y comportamiento en bordes.

- `ratio = GameShelf.score / GameShelf.duration` — escala 0–100, 2 decimales, `null` si falta alguno.
- `personalRatio = GameShelf.score / Backlog.realDuration` — desde el backlog completado con `realDuration`. Si hay varios, se elige el primero o el mejor.
- En `ListItem`, el ratio es `null` cuando la fuente declarada por la lista no tiene score o duration para ese juego.

---

## Privacidad

### Campos en `User`

Ocho secciones independientes, cada una con un `VisibilityLevel` (`apps/api/src/users/constants/visibility.constants.ts`): `private`, `friends`, `public`.

| Sección  | Campo                |
| -------- | -------------------- |
| profile  | `profileVisibility`  |
| queue    | `queueVisibility`    |
| wishlist | `wishlistVisibility` |
| favorite | `favoriteVisibility` |
| feed     | `feedVisibility`     |
| backlog  | `backlogVisibility`  |
| shelf    | `shelfVisibility`    |
| list     | `listVisibility`     |

Más `acceptFollowRequests` (boolean).

### Resolución

Toda la lógica vive en `canView(viewerId, owner, section)` en `apps/api/src/users/helpers/visibility.helper.ts`, en este orden:

1. Si el viewer es el owner → `true`. Self-view siempre permitida.
2. Nivel `public` → `true`, incluso sin autenticar.
3. Nivel `private` → `false`.
4. Nivel `friends` → requiere viewer autenticado y `areMutualFollowers(viewerId, ownerId)`. **Amigo = seguimiento mutuo.**

### Reglas

- `profile` actúa como puerta de entrada: si `canView(..., "profile")` es `false`, el perfil se sirve como `buildRestrictedProfile()` y no se cargan las demás secciones.
- Las secciones anidadas se chequean con `canView(profile) AND canView(section)`.
- Las solicitudes de seguimiento solo se aceptan cuando `profileVisibility === "private" && acceptFollowRequests`.
- `notes` del backlog nunca aparecen en respuestas públicas, sin importar `backlogVisibility`.
- `email` nunca se serializa en respuestas públicas.
- `GET /games/:id/friends-activity` y `GET /games/:id/players` aplican `canView` con SQL: una sección `friends` solo se sirve al amigo mutuo. En `friends-activity` entran los seguidos con perfil y backlog `public`, más los seguidos mutuos con `public` o `friends`; `players` solo incluye usuarios con perfil y backlog `public`.
- Las cuentas desactivadas (`isActive = false`) no cuentan como conexiones: `GET /users/:username/followers` y `GET /users/:username/following` las omiten, `getFollowerCount` / `getFollowingCount` (y con ellos `followerCount` / `followingCount` del perfil y de las tarjetas) no las cuentan, y `GET /games/:id/friends-activity` y `GET /games/:id/players` no las devuelven.
- `GET /users/search` busca `q` de forma literal: `\`, `%` y `_` se escapan antes del `ILIKE`.
- **Listas seguidas en perfil:** una entry es visible solo cuando el perfil es visible y `ListFollower.isVisible` es `true`.

---

## Activity feed

Eventos registrados:

- `backlog_not_started`, `backlog_playing`, `backlog_completed`, `backlog_abandoned`, `backlog_endless`.
- `wishlist_added`, `shelf_added`.
- `user_followed`, `user_followed_by`.
- `list_created`, `list_followed`.
- `game_reviewed`.

Reglas:

- El feed incluye actividades propias del usuario consultante.
- Filtrado por `feedVisibility` del autor de cada evento.
- Los eventos `backlog_*` solo se emiten cuando el status realmente cambia.

---

## Auth y sesiones

- Access token (JWT): TTL configurable, default 15 minutos.
- Refresh token: TTL configurable, default 30 días. Almacenado como HttpOnly cookie y como hash en DB.
- Rotación: cada refresh emite un access nuevo y reemplaza el refresh token.
- Multi-dispositivo: cada refresh token guarda `deviceInfo`, `createdAt`, `lastUsedAt`.
- Claim `sid` en el JWT trackea actividad por sesión.
- Email y username únicos, lowercased.

### Recuperación de contraseña

- `POST /auth/forgot-password` responde siempre 204, exista o no la cuenta. El correo se envía en segundo plano, así que ni el status ni el tiempo de respuesta revelan si el email está registrado. Solo las cuentas activas (`isActive = true`) reciben el correo. Sin SMTP configurado responde 503 `MAIL_DISABLED`.
- El token de reset son 32 bytes aleatorios en hex (64 caracteres). En `PasswordResetTokens` se guarda solo su hash SHA-256 (`tokenHash`, único).
- TTL configurable con `PASSWORD_RESET_TOKEN_TTL_MINUTES`, default 60 minutos.
- Un usuario tiene como máximo un token vigente: pedir otro borra los anteriores.
- El token es de un solo uso: `POST /auth/reset-password` lo borra al consumirlo, junto con cualquier otro token del usuario, y revoca todas sus sesiones (refresh tokens). Un token desconocido, vencido o ya usado responde 400 `AUTH_INVALID_PASSWORD_RESET_TOKEN`.
- El link del correo apunta a `{WEB_APP_URL}/reset-password?token=<token>`.

### Invitaciones

- Solo un admin invita (`POST /admin/invitations`). Un email que ya tiene cuenta, activa o no, responde 409 `INVITATION_EMAIL_REGISTERED`.
- Una invitación pendiente por email (`UserInvitations.email` único): invitar de nuevo reemplaza la anterior y su link deja de funcionar. Así se reenvía.
- Token igual que el de reset: 32 bytes en hex, solo se guarda el hash SHA-256 (`tokenHash`, único).
- TTL configurable con `USER_INVITATION_TTL_DAYS`, default 7 días. Las vencidas siguen en el listado con `isExpired: true` hasta que se reenvían o revocan.
- Si el correo no se puede enviar, la invitación se descarta y la respuesta es el error del provider (502 o 503).
- `POST /invitations/accept` crea la cuenta con el email de la invitación (no se puede cambiar), borra la invitación e inicia sesión igual que `/auth/register`. Un token desconocido, vencido, revocado o ya usado responde 404 `INVITATION_INVALID_TOKEN`.
- `invitedById` apunta al admin que invitó, con `ON DELETE SET NULL`.
- El link del correo apunta a `{WEB_APP_URL}/accept-invite?token=<token>`.

---

## Rate limiting

- Default: 300 requests/min por usuario autenticado.
- `admin` y `moderator` están exentos.
- Limites diferenciados por tipo de endpoint: público (más restrictivo), usuario (medio), auth (mínimo).
- `authLimiter` (`POST /auth/login`, `/auth/refresh` y `PATCH /auth/password`): 5 por minuto; al superarlos, bloqueo de 15 minutos. `authLimiter` también cubre `POST /auth/reset-password`. `registerLimiter` (`/auth/register` y alta de usuarios desde Admin): 3 por minuto. `passwordResetLimiter` (`POST /auth/forgot-password`): 3 cada 15 minutos. `registerLimiter` también cubre `POST /admin/invitations` y `POST /invitations/accept`. Valores en `apps/api/src/common/config/rate-limiter.config.ts`.

---

## Búsqueda de juegos

- Token-AND con normalización de puntuación y espacios.
- Accent-insensitive sobre títulos.
- Fallback a RAWG cuando no hay match local, salvo `local_only=true`. Importa hasta 3 resultados con detalle, excluye DLCs.
- `force_rawg=true` salta búsqueda local.
- `sort_by=random` disponible para discover.
- Si RAWG está deshabilitado no hay fallback: la búsqueda devuelve solo catálogo local.

## Showcase de juegos

- `GET /games/showcase` es público (sin token, `publicLimiter`) y solo expone datos de catálogo: `id`, `code`, `title`, `backgroundUrl`, y `score`, `hours` y `ratio` del juego destacado.
- Devuelve hasta 21 juegos activos, no DLC y con `backgroundUrl`, ordenados por `GamePopularities.score` desc, `title` asc e `id` asc.
- `featured` es el juego del set con mejor ratio usando las fuentes canónicas de `sort_by=ratio` (score de la fuente con menor `priority` normalizado a 0–5; duración `completr` → `hltb` → `rawg`). Es `null` si ninguno tiene score y duración.
- La respuesta se cachea en memoria 30 minutos por proceso. Si el refresco falla y hay un resultado previo, se sirve ese.

## Providers externos

- Un provider externo expone `isEnabled` en su clase base.
- Si falta su credencial, el `create` de la clase base devuelve la implementación deshabilitada: el backend arranca igual y cada método lanza `<PROVIDER>_DISABLED`.
- RAWG: `RAWG_API_KEY` es opcional (vacía o ausente = deshabilitado).
- Mail: `SMTP_HOST` es opcional (vacío o ausente = deshabilitado). Códigos: `MAIL_DISABLED` (503) y `MAIL_SEND_ERROR` (502).

### Códigos de error de RAWG

| Código                | Status |
| --------------------- | ------ |
| `RAWG_DISABLED`       | 503    |
| `RAWG_NOT_FOUND`      | 404    |
| `RAWG_RATE_LIMITED`   | 429    |
| `RAWG_REQUEST_ERROR`  | 502    |
| `RAWG_PARSE_ERROR`    | 502    |
| `RAWG_INTERNAL_ERROR` | 500    |

Con RAWG deshabilitado: `GET /games/rawg-lookup`, `GET /games/rawg-detail/:rawgId`, `GET /game-external/rawg/:slug` y `POST /admin/jobs/populate-rawg` responden 503; el resto del backend no se ve afectado.
