# Invariantes

Lo que el código hace cumplir, en forma atómica: enums, constraints, validaciones, códigos de error, nombres de eventos y comportamientos automáticos.

**Este archivo describe el mecanismo, no la decisión de producto detrás.** Acá está cómo se llama cada enum, qué constraint existe y qué código de respuesta devuelve la API al violar una regla. El porqué de cada regla —cuánto obtiene cada tier, qué significa cada estado para el usuario— es planificación de producto y no se documenta en este repo.

Arquitectura en [`architecture.md`](./architecture.md), endpoints en [`api/`](./api/).

Todo listado ordenado por un campo que puede repetirse (fechas, posición, nombre) desempata por `id` en la misma dirección, así que dos filas con el mismo valor salen siempre en el mismo orden y la paginación no repite ni salta filas.

---

## Roles

Enum `User.role` en `apps/api/src/users/user-role.type.ts`: `user`, `premium`, `moderator`, `admin`. Default al registrarse: `user`.

- El gating premium se resuelve con `isPremium()`, que acepta `premium`, `moderator` y `admin`. El export usa la versión compartida `isPremiumRole()` de `apps/api/src/common/utils/is-premium-role.util.ts`, con los mismos roles.
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
- `PATCH /users/me/queue/:backlogId/position` con `{ position }` mueve una sola entrada a esa posición (base 1) de la queue completa y desplaza las demás, en una transacción bajo el advisory lock; no depende de lo que el cliente tenga cargado, así que no pierde entradas ocultas por búsqueda o paginación. Una posición mayor que el tamaño de la queue se ajusta a la última; `position` no entero, menor que 1 o basura responde 422 `COMMON_SCHEMA_INVALID`; un backlog que no está en la queue del usuario (incluido el de otro usuario) responde 404 `QUEUE_BACKLOG_NOT_FOUND`. Devuelve la queue completa, como `PUT`.
- `PUT /users/me/queue` reemplaza la queue entera (borra y recrea): solo es válido cuando el cliente envía el orden completo. Los movimientos individuales usan el `PATCH`.
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

## Platinos

- Tabla `GamePlatinums`, un platino por usuario y juego: unique `(userId, gameId)`. Es independiente de `GameShelf`: el platino sigue aunque el usuario ya no tenga el juego.
- Campos opcionales: `backlogId` (la run donde se consiguió), `platformId`, `platinumedAt` (fecha) y `notes` (recortadas, hasta 500 caracteres; vacías se guardan como `null`).
- FKs: `userId` y `gameId` con `ON DELETE CASCADE`; `backlogId` con `ON DELETE SET NULL`, así que borrar la run deja el platino sin run; `platformId` sin `ON DELETE` (una plataforma con platinos responde `PLATFORM_IN_USE` al borrarla).
- `PUT /users/me/games/:gameId/platinum` crea (201) o reemplaza (200) el platino completo: un campo omitido queda en `null`. Si llega `backlogId` sin `platformId`, se usa la plataforma de la run.
- `backlogId` de una run inexistente o de otro usuario responde 404 `GAME_PLATINUM_BACKLOG_NOT_FOUND`; de una run propia de otro juego, 422 `GAME_PLATINUM_BACKLOG_GAME_MISMATCH`. Un juego inexistente o inactivo responde 404 `GAME_PLATINUM_GAME_NOT_FOUND`, y una plataforma inexistente, 422 `GAME_PLATINUM_PLATFORM_NOT_FOUND`.
- `DELETE /users/me/games/:gameId/platinum` responde 204, o 404 `GAME_PLATINUM_NOT_FOUND` si no hay platino. La activity ya registrada no se borra.
- La activity `game_platinumed` se registra solo al crear el platino, no al actualizarlo.
- `GET /users/:username/platinums` lista los platinos de un usuario, paginado con `limit` (1 a 100), `offset` y `search` opcional sobre el título del juego con las [reglas de búsqueda de texto](#reglas-de-búsqueda-de-texto). Orden: `platinumedAt` descendente con los platinos sin fecha al final, luego `createdAt` descendente e `id` de desempate. Cada entrada lleva el juego (`id`, `code`, `title`, `backgroundUrl`, `isDlc`) y la plataforma (`id`, `name`, `abbreviation`, o `null`); `total` cuenta lo que cumple el filtro. Exige `canView` de `profile` y de `platinum` (403 `USER_PRIVATE` si no) y responde 404 `USER_NOT_FOUND` para un usuario inexistente. Para otros viewers omite `notes` y pone `backlogId` en `null` si la run es privada; el dueño lo recibe completo.
- `GET /users/me/platinums` lista los platinos del usuario autenticado con la misma paginación, búsqueda, orden y forma que `GET /users/:username/platinums`, sin chequeos de visibilidad y siempre con `notes` y `backlogId`. Se registra antes de `/users/:username/platinums` para que `me` no se tome como username.
- Cada run de `GET /users/me/backlog` y `GET /users/:username/backlog` lleva `platinum` (el mismo objeto para todas las runs del juego, o `null`), cargado con una sola consulta por request; la ficha (`GET /games/:code`) lleva `userPlatinum` del usuario autenticado. Las demás respuestas que reutilizan el serializer del backlog (perfil, highlights, completions, alta y edición de runs) no cargan el platino y omiten la clave.
- En el backlog público el platino exige poder ver el backlog y la sección `platinum` del dueño. Sin acceso a `platinum`, cada run lleva `platinum: null` y `platinumed_only` se ignora, para no revelar qué juegos están platinados. Con acceso, para otros viewers omite `notes` y pone `backlogId` en `null` si la run del platino es privada.
- El filtro `platinumed_only` del backlog (también en saved filters) deja las runs de los juegos platinados por el dueño, todas y no solo la del platino.

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
- **Visibilidad de una lista de otro usuario:** quien no es el dueño la ve solo si cumple las tres condiciones a la vez: `canView(viewer, owner, "profile")`, `canView(viewer, owner, "list")` y `List.isPublic`. El dueño ve siempre todas las suyas. El orden de precedencia es perfil, luego sección de listas, luego `isPublic`. Seguir una lista (`ListFollower`) no salta la regla para leerla. Las listas oficiales (de un admin) siguen la misma regla.
- La regla vive en `visibleListsCondition(viewerId)` (SQL, para consultas) y en `canViewList(viewerId, owner, list)` (en memoria, cuando el dueño ya está cargado), ambas en `apps/api/src/users/helpers/visibility.helper.ts`. Los listados agregados (`GET /lists/recent`, `GET /lists/official`, `GET /lists/search`, `GET /games/:id/lists`, `GET /users/:username/following-lists`) filtran en la consulta, así que `limit`, `total` y la paginación cuentan solo lo visible.
- Una lista que existe pero que quien pide no puede ver (por `listVisibility` o por `isPublic`) responde igual que una inexistente: 404 `LIST_NOT_FOUND`, para no revelar su existencia. Esto aplica a `GET /lists/:listId` y a `GET /users/:username/lists/:listId`; en el segundo, `USER_NOT_FOUND` queda solo para un usuario inexistente y `USER_PRIVATE` (403) para un perfil no visible.
- `GET /lists/:listId/followers` aplica la misma regla: una lista que quien pide no puede ver responde 404 `LIST_FOLLOWER_LIST_NOT_FOUND`, indistinguible de una inexistente. `POST /lists/:listId/follow` sobre una lista pública que quien pide no puede ver responde también 404 `LIST_FOLLOWER_LIST_NOT_FOUND`; sobre una privada sigue respondiendo 403 `LIST_FOLLOWER_NOT_PUBLIC`.
- `POST /lists/:listId/duplicate` sobre la lista pública de otro usuario que quien pide no puede ver responde 404 `LIST_NOT_FOUND`; sobre una privada ajena sigue respondiendo 403 `LIST_FORBIDDEN`.
- `GET /users/:username/following-lists` y `GET /lists/following` excluyen las listas que quien pide no puede ver según la regla, incluso las que sigue él mismo. El listado público del perfil excluye además los follows con `ListFollower.isVisible = false`. Ambos filtros van en la consulta, así que `total` y la paginación cuentan solo lo visible.
- `GET /users/:username/lists` exige `canView(..., "profile")` y `canView(..., "list")`; si alguna falla responde 403 `USER_PRIVATE`.
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

### Rangos válidos

- `GameScore.score` va de 0 a la `scale` de su fuente, ambos inclusive. El mínimo lo valida el schema (negativo responde 422 `COMMON_SCHEMA_INVALID`); el máximo depende de la fuente y lo valida el service (por encima de la `scale` responde 422 `GAME_SCORE_OUT_OF_RANGE`). Aplica a `POST /game-scores`, `PATCH /game-scores/:gameId/:source` `PUT /games/:gameId/scores` y `POST /games` (con score 0 aceptado).
- `GameTime.duration` es mayor que 0 (cero o negativo responde 422 `COMMON_SCHEMA_INVALID`). Aplica a `POST /game-times`, `PATCH /game-times/:gameId/:source` y `PUT /games/:gameId/times`.

### Géneros y plataformas

- El `code` de un género se genera del nombre con `slugify`. Un nombre que no produce slug (por ejemplo `!!!`) responde 400 `GENRE_VALIDATION_ERROR` al crear y al renombrar.
- Renombrar un género a un nombre o code ya existente responde 409 `GENRE_UNIQUE_CONSTRAINT`.
- Borrar un género o una plataforma inexistente responde 404 `GENRE_NOT_FOUND` / `PLATFORM_NOT_FOUND`.

### Edición y borrado de juegos

- `PATCH /games/:id` es atómico: el update del juego y el reemplazo de plataformas, géneros y external ids van en una sola transacción. Si un paso falla no se aplica ninguno.
- `PATCH /games/:id` desvincula un DLC de su padre con `parentGameId: null`; si lo omite, el padre se conserva. Con `isDlc: false` el padre se limpia siempre, aunque el body repita `parentGameId`: un juego que no es DLC no tiene padre. Un juego no puede ser su propio padre (400 `GAME_VALIDATION_ERROR`) y un `parentGameId` inexistente responde 422 `COMMON_REFERENCE_NOT_FOUND`.
- `POST /games/:id/split` guarda títulos y etiquetas recortados y responde 400 `GAME_SPLIT_INVALID` si dos títulos dan el mismo code, si un título no produce code, si una etiqueta queda vacía o si dos etiquetas coinciden sin distinguir mayúsculas ni espacios: la etiqueta es lo único que distingue a variantes que comparten external id.
- Un external id repetido para el mismo juego y fuente responde 409 `GAME_EXTERNAL_ALREADY_EXISTS`; un external id inexistente, 404 `GAME_EXTERNAL_NOT_FOUND`.
- `DELETE /games/:id` sin `hard` desactiva el juego (`isActive = false`) y no toca sus datos.
- `DELETE /games/:id?hard=true` (solo admin) borra el juego y sus datos de catálogo (plataformas, géneros, scores, times, external ids, popularidad e items de compilation). Antes de borrar, dentro de una transacción, comprueba con consultas explícitas que ningún usuario lo referencia: backlog (también como `compilationGameId`, y por tanto su queue), game-shelf, list-items, favoritos, wishlist, reviews, coop runs, mood tags por juego, platinos y actividad; y que no tiene variantes ni DLCs (`parentGameId`). Si lo está responde 409 `GAME_IN_USE` y no se borra nada; el `ON DELETE` de las FKs no se usa como control. Los reports del juego no cuentan como uso y se borran con él.

### Sagas

- Una saga siempre tiene juegos: `POST /franchises` exige `gameIds` con al menos un id, y `PATCH /franchises/:id` acepta `gameIds` opcional pero nunca vacío (422 `COMMON_SCHEMA_INVALID`). `gameIds` es el conjunto final de juegos de la saga: la saga y los vínculos se aplican en una sola transacción: los juegos listados quedan con ese `franchiseId` y los que la saga tenía y no aparecen se desvinculan (`franchiseId = null`). Si algún id no existe responde 404 `FRANCHISE_GAMES_NOT_FOUND` y no se aplica nada. Sin `gameIds` los juegos no se tocan.
- Crear, editar y borrar sagas requiere rol `moderator` o `admin`. Un usuario solo puede seguirlas (`POST` / `DELETE /franchises/:code/track`).
- `GET /franchises` y `GET /franchises/:code` aceptan visitantes (auth opcional; un token inválido cuenta como visitante). Ninguna respuesta de sagas incluye progreso personal: el conteo es `gameCount`, los juegos activos de la saga.
- `GET /users/:username/franchises` exige `canView` de `profile` y de `franchise` (403 `USER_PRIVATE`); la visibilidad del backlog no aplica.
- `GET /franchises` incluye en cada saga `previewGames`: hasta 4 juegos activos ordenados por fecha de lanzamiento (desempate por id), e `isTracked` del visitante (`false` sin sesión).

### Datos crudos

- RAWG rating se almacena en escala 0–5; no se normaliza al persistir.
- La normalización a escala 100 ocurre al calcular ratios.

### Jobs de actualización masiva

- Solo `admin` puede dispararlos.
- `DELETE /admin/jobs/:jobId` valida que `jobId` sea un UUID: otro valor responde 422 `COMMON_SCHEMA_INVALID`.
- `calculate-ratings` y `calculate-durations` exigen mínimo del **10% de usuarios** con dato para emitir score Completr.

---

## Ratio

Fórmulas y comportamiento en bordes.

- `ratio = GameShelf.score / GameShelf.duration` — escala 0–100, 2 decimales, `null` si falta alguno.
- `personalRatio = GameShelf.score / Backlog.realDuration` — desde el backlog completado con `realDuration`. Si hay varios, se elige el primero o el mejor.
- En `ListItem`, el ratio es `null` cuando la fuente declarada por la lista no tiene score o duration para ese juego.
- Las stats agregadas del backlog (`avgRatio`, `avgPersonalRatio` y el `value` de `bestPersonalRatio`) usan la misma escala 0–100 y 2 decimales que `ratio` y `personalRatio`. El multiplicador sale de `RATIO_SCORE_MULTIPLIER` en `calculate-ratio.util.ts`.
- `highlights.month` del perfil expone `longestPlayed` (mayor `realDuration`), `bestPersonalRatio` (mayor `personalRatio` entre las completadas con `realDuration` mayor que 0 y `score`) y `highestRated` (mayor `userRating`). Cada uno es `null` si ninguna entrada del mes califica.

---

## Rewind

Resumen anual de un usuario, calculado al vuelo a partir de sus runs y platinos; no tiene tabla propia. Vive en `apps/api/src/rewind/`: las consultas en `rewind.service.ts` (pide las runs a `backlog.service`, los géneros a `game-genre.service` y los platinos a `game-platinum.service`) y los cálculos, sin base de datos, en `utils/`, con la fecha de hoy como parámetro.

- **Año abierto:** un año `Y` está abierto si es anterior al año actual, o si es el año actual y hoy es 1 de diciembre o después. Fechas en UTC (`rewind.constants.ts`: `REWIND_OPENING_MONTH = 12`).
- **Año de registro:** solo existen los años desde el de `User.createdAt` (UTC) en adelante; los anteriores (historial importado) no aparecen en `years` ni en `otherYears` y su detalle responde 404 `REWIND_NOT_FOUND`, también para el dueño.
- **`REWIND_TODAY`:** variable de entorno opcional (`YYYY-MM-DD`) que reemplaza "hoy" (a medianoche UTC) en todos los cálculos del Rewind; se ignora con `NODE_ENV=prod`.
- **Año con datos:** al menos una run con `startedAt` en el año, o `completed` / `abandoned` con `finishedAt` en el año. Un año existe si está abierto, tiene datos para quien mira y cae entre 2000 y 2100.
- **Ventana destacada:** del 1 de diciembre de `Y` al 31 de enero de `Y+1`, ambos incluidos, en UTC. `spotlightYear` es ese `Y` solo si el año está en la lista; `isSpotlight` es `true` mientras hoy esté en la ventana de su año.
- **Quién ve qué:** el dueño ve el cálculo con todas sus runs; cualquier otro, solo con las runs `isPublic = true`, así que un año que solo tiene runs privadas no existe para él. `totals.platinums` cuenta los platinos con `platinumedAt` en el año y es `null` si quien mira no puede ver la sección `platinum`. Las `notes` nunca se devuelven.
- **Totales:** `finished`, `abandoned` y `started` cuentan juegos distintos (`gameId`); `hoursPlayed` suma `realDuration` de las runs `completed` y `abandoned` con `finishedAt` en el año, redondeado a 1 decimal (0 sin datos).
- **Juegos terminados:** uno por juego, con su última run `completed` del año, por `finishedAt` ascendente e `id` de la run.
- **Highlights:** `topRated` (mayor `userRating`; desempata `finishedAt` más reciente e `id`), `bestRatio` (mayor `calculateRatio(score, realDuration)` con `realDuration > 0`; mismo desempate), `longest` / `fastest` (`realDuration` > 0 o, si no, `duration` > 0 con `isEstimate: true`; desempata `finishedAt` más antiguo e `id`; `fastest` es `null` si sería el mismo juego que `longest`), `favoriteGenre` (más juegos terminados distintos; desempata el nombre), `topPlatform` (más runs terminadas; desempata el nombre) y `busiestMonth` (más juegos terminados; desempata el mes más temprano). Cada uno es `null` si no hay de dónde elegir.
- **Campos nuevos:** `totals.finishRate` es `round(finished / (finished + abandoned) * 100)` o `null` si ambos son 0; `totals.averageRating` promedia el `userRating` de las runs terminadas con nota (1 decimal, `null` sin notas); `genresPlayed` y `platformsPlayed` cuentan géneros de los juegos terminados y plataformas de las runs terminadas. `firstFinished` / `lastFinished` son el primer y último elemento de `finishedGames`. `topGenres` / `topPlatforms` son hasta 3, con el criterio de `favoriteGenre` / `topPlatform` (que son su primer elemento). `longestStreak` es la racha más larga de meses consecutivos del año con algún juego terminado (por la última run de cada juego), desempata la más temprana y es `null` si es menor a 2 meses.
- **Persona:** la primera que se cumple: `trophy-hunter` (`platinums >= 3`, nunca con `platinums` `null`), `marathoner` (`finished >= 3` y promedio de horas por juego terminado `>= 30`), `short-and-sweet` (`finished >= 5` y promedio `<= 8`), `finisher` (`finished >= 10` y `finishRate >= 80`), `genre-explorer` (`genresPlayed >= 6`), `picky-player` (`abandoned > finished` y `abandoned >= 3`) y si no `steady-player`. El promedio usa las horas de `longest`/`fastest` (real o estimada) de la última run de cada juego y deja fuera los juegos sin horas; sin ninguno, no hay promedio. Umbrales en `rewind.constants.ts`.
- **Portadas de la lista de años:** hasta 5 juegos terminados, primero los de mayor `userRating` y luego por `finishedAt` descendente.
- `GET /users/:username/rewinds` y `GET /users/:username/rewinds/:year` exigen `canView` de `profile` y de `rewind` (403 `USER_PRIVATE`) y responden 404 `USER_NOT_FOUND` para un usuario inexistente o desactivado. `:year` solo acepta dígitos entre 2000 y 2100 (422 `COMMON_SCHEMA_INVALID`); un año cerrado o sin datos para quien mira responde 404 `REWIND_NOT_FOUND`.

---

## Privacidad

### Campos en `User`

Once secciones independientes, cada una con un `VisibilityLevel` (`apps/api/src/users/constants/visibility.constants.ts`): `private`, `friends`, `public`.

| Sección   | Campo                 |
| --------- | --------------------- |
| profile   | `profileVisibility`   |
| queue     | `queueVisibility`     |
| wishlist  | `wishlistVisibility`  |
| favorite  | `favoriteVisibility`  |
| feed      | `feedVisibility`      |
| backlog   | `backlogVisibility`   |
| shelf     | `shelfVisibility`     |
| list      | `listVisibility`      |
| platinum  | `platinumVisibility`  |
| franchise | `franchiseVisibility` |
| rewind    | `rewindVisibility`    |

Todas arrancan en `public` para una cuenta nueva. `platinumVisibility` se agregó después que las demás: la migración `add-platinumvisibility-to-users` copió en cada cuenta existente su `backlogVisibility`, porque hasta entonces los platinos solo se veían a través del backlog. `franchiseVisibility` (las sagas que sigue el usuario) siguió el mismo camino con `add-franchisevisibility-to-users`: hasta entonces `GET /users/:username/franchises` exigía la sección `backlog`. `rewindVisibility` (el Rewind anual) llegó con `add-rewindvisibility-to-users`, que también copió `backlogVisibility` en cada cuenta existente.

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
- `GET /users/search` busca `q` con las [reglas de búsqueda de texto](#reglas-de-búsqueda-de-texto) sobre `username` y `name`: sin acentos ni mayúsculas, por palabras en cualquier orden y de forma literal (`\`, `%` y `_` no son comodines). Una `q` sin letras ni dígitos devuelve lista vacía.
- `GET /users/:username/followers` y `GET /users/:username/following` paginan en la consulta: `limit` entero entre 1 y 100 (por defecto 24), `offset` desde 0 (por defecto 0) y `search` opcional de 1 a 100 caracteres, que busca en `username` y `name` del usuario listado con las [reglas de búsqueda de texto](#reglas-de-búsqueda-de-texto) (un `search` sin letras ni dígitos no filtra). El orden es `createdAt` descendente con `id` de desempate, y `total` cuenta lo que cumple el filtro, sin cuentas desactivadas. Cualquier otro valor responde 422 `COMMON_SCHEMA_INVALID`.
- **Listas seguidas en perfil:** una entry es visible solo cuando el perfil es visible, `ListFollower.isVisible` es `true` y la lista cumple la regla de visibilidad de listas (ver "Listas y list-items").

---

## Activity feed

Eventos registrados:

- `backlog_not_started`, `backlog_playing`, `backlog_completed`, `backlog_abandoned`, `backlog_endless`.
- `wishlist_added`, `shelf_added`.
- `user_followed`, `user_followed_by`.
- `list_created`, `list_followed`.
- `game_reviewed`.
- `game_platinumed`.

Reglas:

- El feed incluye actividades propias del usuario consultante.
- Filtrado por visibilidad del autor de cada evento, en la consulta, así que `total` y la paginación solo cuentan lo visible: el feed exige `canView` de `profile` y de `feed`. Un autor con ambos en `public` se ve para quien lo sigue; con `friends` en cualquiera de los dos solo se ve si el seguimiento es mutuo; con `private` en cualquiera de los dos solo lo ve el propio autor.
- Los eventos `user_followed` y `user_followed_by` nunca se devuelven en el feed.
- `game_platinumed` exige además `canView` de `platinum` del autor, también en la consulta: con `platinumVisibility` en `friends` solo lo ven los seguidores mutuos y en `private` solo el autor. En la actividad reciente del perfil (`GET /users/:username`) se omite para quien no puede ver los platinos.
- Los filtros `category` y `types` son premium (`premium`, `moderator`, `admin`): un free que los envía recibe 402 `ACTIVITY_FEED_FILTER_PREMIUM`. Con ambos, el resultado es la intersección.
- Los eventos `backlog_*` solo se emiten cuando el status realmente cambia.

---

## Export de colecciones

Endpoints: `GET /users/me/backlog/export`, `/users/me/queue/export`, `/users/me/game-shelf/export`, `/users/me/wishlist/export`, `/users/me/favorites/export`, `/users/me/platinums/export` y `GET /lists/:listId/export`. Las columnas de cada recurso viven en su `*.export-row.mapper.ts` (`BACKLOG_EXPORT_COLUMNS`, `QUEUE_EXPORT_COLUMNS`, etc.) y están documentadas en [`api/`](./api/).

- El formato se negocia por el header `Accept` con `req.accepts(["text/csv", "application/json"])` en `exportFormatNegotiationMiddleware`; no hay parámetro `format`. Sin `Accept`, con solo comodines o cuando gana `text/csv` → CSV; cuando gana `application/json` → JSON; si no se acepta ninguno → 406 `EXPORT_FORMAT_NOT_ACCEPTABLE` (`Common Module`). Toda respuesta lleva `Vary: Accept`.
- JSON es premium (`isPremiumRole()`): un free recibe 402 `EXPORT_FORMAT_PREMIUM` (`Common Module`), lo verifica `exportFormatAccessMiddleware` sobre el formato negociado, antes de consultar.
- Cada export acepta los mismos filtros, búsqueda y orden que su listado, sin paginación (`limit` y `offset` se ignoran); sin parámetros exporta la colección completa. Un valor inválido responde 422 `COMMON_SCHEMA_INVALID`. Se resuelve con una sola consulta por recurso.
    - Backlog: `BacklogExportQuerySchema` (`BacklogQuerySchema` sin `limit`/`offset`), con `buildBacklogWhere` y el mismo orden que `GET /users/me/backlog` (por defecto `createdAt` descendente).
    - Queue: `search` y `sort` (`manual` por defecto, `ratio`, `score`, `duration`) en `QueueExportQuerySchema`. `manual` es `position` ascendente; `ratio` y `score` van descendentes y `duration` ascendente, con los valores nulos al final y los empates por `position` (`sortQueueExport`).
    - Game shelf, wishlist y platinos: `search` y `platform` (`ExportPlatformSearchQuerySchema`). `platform` es un UUID (solo esa plataforma) o `any` (solo filas sin plataforma, `buildPlatformFilterWhere`). Orden: título del juego en game shelf, `position` en wishlist y `platinumedAt` descendente (sin fecha al final) en platinos.
    - Favorites: `search` (`ExportSearchQuerySchema`), orden por `position`.
    - Listas: sin parámetros de filtro, orden por `position`.
- `GET /lists/:listId/export` solo exporta listas propias: una lista ajena (aunque sea pública) o inexistente responde 404 `LIST_NOT_FOUND`.
- Respuesta: `Content-Disposition: attachment; filename="completr-<recurso>-YYYY-MM-DD.<csv|json>"` con la fecha en UTC (`completr-list-<slug>-…` para listas, `completr-list-…` si el nombre no da slug). CORS expone `Content-Disposition` (`exposedHeaders` en `cors.config.ts`).
- CSV (`serializeCsv()`): `text/csv; charset=utf-8`, BOM UTF-8, fila de cabecera, coma, `\r\n` al final de cada línea, escape RFC 4180. Un texto que empieza con `=`, `+`, `-`, `@`, tab o CR se prefija con `'`. `null` es un campo vacío. Un resultado vacío devuelve solo la cabecera.
- JSON: `application/json; charset=utf-8`, un array desnudo (sin `data`) con las mismas claves que las columnas del CSV y tipos nativos; un resultado vacío devuelve `[]`.

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
- Enfriamiento por cuenta: si el token vigente se creó hace menos de `PASSWORD_RESET_COOLDOWN_MINUTES` (default 5), no se crea otro ni se envía correo, y la respuesta sigue siendo 204. La comprobación y la creación van en una transacción con un lock de PostgreSQL por usuario, así que pedidos concurrentes producen un solo token y un solo correo.
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
- La clave del límite es la IP del cliente, resuelta por `resolveClientIp` (`common/utils/client-ip.util.ts`). Si `CLIENT_IP_HEADER` está definida (por ejemplo `cf-connecting-ip`), se toma esa cabecera siempre que contenga una IP válida; si falta, viene vacía o no es una IP, se usa `request.ip`. Sin la variable, siempre `request.ip`.
- `RATE_LIMIT_ENABLED` (default `true`) en `false` desactiva el rate limit. En `NODE_ENV=test` queda desactivado siempre.

---

## Reglas de búsqueda de texto

Toda búsqueda de texto de la API (el `search` de los listados paginados, `q` de `GET /users/search`, `query` de `GET /lists/search` y `GET /games/search`) usa el mismo mecanismo, definido una sola vez en `apps/api/src/common/utils/text-search.util.ts`. Ningún service arma su propio `ILIKE`.

- **Normalización.** La consulta y las columnas se comparan en minúsculas, sin acentos y solo con `a-z0-9`: el signo de puntuación y los espacios no cuentan. En SQL la columna pasa por `regexp_replace(lower(unaccent(columna)), '[^a-z0-9]', '', 'g')` (extensión `unaccent`); en TypeScript la consulta pasa por `tokenizeSearchQuery`. `pokemon` encuentra `Pokémon` y `spiderman` encuentra `Spider-Man`.
- **Palabras.** La consulta se separa en palabras (cualquier carácter que no sea `a-z0-9` las divide) y el registro tiene que contener todas, en cualquier orden y sin tener que ser contiguas: `evil resident` encuentra `Resident Evil`. Cada palabra se busca como subcadena del texto normalizado.
- **Literal.** `%`, `_` y `\` no son comodines: la normalización los descarta antes de armar el `LIKE`, así que nunca llegan al patrón.
- **Varias columnas.** Cuando una búsqueda mira más de una columna (`username` y `name` de un usuario, `name` y `description` de un filtro guardado), cada palabra tiene que estar en al menos una de ellas; las palabras pueden repartirse entre columnas (`pepe garcia` encuentra al usuario `pepe99` con nombre `José García`). Las columnas de un modelo incluido se referencian por su alias (`Game.title`, `Backlog->Game.title`, `Follower.username`).
- **Consulta vacía.** Si tras normalizar no queda ninguna palabra (`%`, `_`, `\`, solo signos), el listado paginado no filtra y devuelve todo lo que devolvería sin `search`. Los endpoints cuya función es buscar (`GET /users/search`, `GET /lists/search`, `GET /games/search`) devuelven lista vacía.
- **Orden de relevancia.** `buildTextSearchRelevanceOrder` ordena por título normalizado igual a la consulta, luego por título que empieza con ella y luego el resto; dentro de cada grupo, `title` ascendente y `id` de desempate. Lo usan `GET /games/search` (local) y `searchGames`. Los listados con orden propio (backlog, favoritos, queue, etc.) lo conservan.
- **Límite.** El orden se aplica antes del `limit`, así que con más coincidencias que el límite (10 en `local_only=true`) el título exacto entra igual.

## Búsqueda de juegos

- Sigue las [reglas de búsqueda de texto](#reglas-de-búsqueda-de-texto) sobre `Game.title`.
- Fallback a RAWG cuando no hay match local, salvo `local_only=true`. Importa hasta 3 resultados con detalle, excluye DLCs.
- `force_rawg=true` salta búsqueda local y propaga el fallo de la búsqueda en RAWG (429 `RAWG_RATE_LIMITED`, 502 `RAWG_REQUEST_ERROR` / `RAWG_PARSE_ERROR`). En el fallback implícito el fallo se registra como warning y la respuesta es 200 con lista vacía. El fallo al resolver un resultado individual se tolera en ambos casos.
- `sort_by=random` disponible para discover.
- `force_rawg` y `local_only` se parsean con `z.stringbool()`: `"true"` / `"false"` (y sus variantes) valen lo que dicen; cualquier otro valor responde 422 `COMMON_SCHEMA_INVALID`.
- `GET /games` con `min_score` / `max_score` compara contra el score canónico normalizado a 0–5 (el de la fuente con menor `priority`), el mismo que usa `sort_by=score`; los juegos sin score quedan fuera del rango.
- `GET /games/latest-reviewed` acepta `limit` entero entre 1 y 50 (por defecto 16); otro valor o un parámetro desconocido responde 422 `COMMON_SCHEMA_INVALID`. Los juegos inactivos se descartan antes de aplicar el `limit`.
- `PATCH /games/:id` con un título cuyo slug ya usa otro juego responde 409 `GAME_UNIQUE_CONSTRAINT`. `DELETE /games/:id` (baja lógica) sobre un juego inexistente o ya inactivo responde 404 `GAME_NOT_FOUND` y no registra auditoría.
- `GET /genres/:code/games` devuelve cada juego con todos sus géneros; el género pedido solo filtra qué juegos entran.
- Si RAWG está deshabilitado no hay fallback: la búsqueda devuelve solo catálogo local.

## Showcase de juegos

- `GET /games/showcase` es público (sin token, `publicLimiter`) y solo expone datos de catálogo de cada juego: `id`, `code`, `title`, `backgroundUrl`, `releaseYear`, `genres` (nombres, orden alfabético), `score`, `hours` y `ratio`.
- Toma un pool de hasta 80 juegos activos, no DLC y con `backgroundUrl`, ordenados por `GamePopularities.score` desc, `title` asc e `id` asc, y devuelve una muestra al azar de 21 de ese pool, en orden aleatorio.
- `score`, `hours` y `ratio` usan las fuentes canónicas de `sort_by=ratio` (score de la fuente con menor `priority` normalizado a 0–5; duración `completr` → `hltb` → `rawg`). Son `null` cuando falta el dato; `ratio` es `null` si falta score o duración. No hay juego destacado en la respuesta: lo elige el cliente.
- La muestra se cachea en memoria 30 minutos por proceso, así que cambia con cada refresco. Si el refresco falla y hay un resultado previo, se sirve ese.

## Providers externos

- Un provider externo expone `isEnabled` en su clase base.
- Si falta su credencial, el `create` de la clase base devuelve la implementación deshabilitada: el backend arranca igual y cada método lanza `<PROVIDER>_DISABLED`.
- RAWG: `RAWG_API_KEY` es opcional (vacía o ausente = deshabilitado). Sus métodos deshabilitados devuelven una promesa rechazada con `RAWG_DISABLED`, no lanzan de forma síncrona.
- Mail: `SMTP_HOST` es opcional (vacío o ausente = deshabilitado). Códigos: `MAIL_DISABLED` (503) y `MAIL_SEND_ERROR` (502).

### Códigos de error de RAWG

| Código                | Status | Cuándo                                                              |
| --------------------- | ------ | ------------------------------------------------------------------- |
| `RAWG_DISABLED`       | 503    | `RAWG_API_KEY` ausente o vacía                                      |
| `RAWG_NOT_FOUND`      | 404    | RAWG respondió 404                                                  |
| `RAWG_RATE_LIMITED`   | 429    | RAWG respondió 429                                                  |
| `RAWG_REQUEST_ERROR`  | 502    | RAWG respondió con otro status de error, o falló la red al llamarlo |
| `RAWG_PARSE_ERROR`    | 502    | RAWG respondió 2xx con un cuerpo que no es JSON válido              |
| `RAWG_INTERNAL_ERROR` | 500    | Código de `RAWG Provider` sin mapeo propio                          |

Con RAWG deshabilitado: `GET /games/rawg-lookup`, `GET /games/rawg-detail/:rawgId`, `GET /game-external/rawg/:slug` y `POST /admin/jobs/populate-rawg` responden 503; el resto del backend no se ve afectado.

El job `populate_rawg` cuenta como no encontrado un juego al que RAWG responde 404 (`RAWG_NOT_FOUND`) y sigue con el siguiente. Cualquier otro fallo (429, 5xx, red, cuerpo ilegible o error al guardar) lo detiene de inmediato con status `failed` y un `result` con los juegos procesados, los no encontrados y el motivo.
