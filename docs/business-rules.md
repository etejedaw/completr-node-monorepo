# Reglas de negocio

Lista atómica de las reglas que el backend hace cumplir. No incluye conceptos (ver [`CONTEXT.md`](../CONTEXT.md)), arquitectura (ver [`architecture.md`](./architecture.md)) ni endpoints (ver [`api/`](./api/)).

---

## Roles

Cuatro roles en el enum `User.role` (ver `src/users/user-role.type.ts`):

- `user`, `premium`, `moderator`, `admin`.

Reglas asociadas:

- `user` es el rol por defecto al registrarse.
- `moderator` puede CRUD sobre `games`, `platforms`, `genres` y `game-reports`, pero no borrar juegos.
- `admin` puede todo. Es el único que borra juegos, reactiva inactivos, dispara jobs y consulta `audit`.
- `premium`, `moderator` y `admin` tienen los límites de usuario extendidos a sin tope.
- El registro público está cerrado: solo `admin` puede crear usuarios (siempre con rol `user`).

---

## Límites por usuario

| Recurso         | Límite por defecto | Sin tope para                   |
| --------------- | ------------------ | ------------------------------- |
| `lists`         | 5                  | `premium`, `moderator`, `admin` |
| `saved-filters` | 5                  | `premium`, `moderator`, `admin` |
| `favorites`     | 10                 | `premium`, `moderator`, `admin` |
| `wishlist`      | 20                 | `premium`, `moderator`, `admin` |

**Estado congelado:** si un usuario excede su límite (típicamente por cambio de rol), los recursos existentes quedan visibles pero **no puede crear ni editar** hasta volver bajo el límite. Solo borrar es posible. Error `402` al intentar crear sobre el tope.

---

## Backlog

### Estados

Enum `Backlog.status`: `not_started`, `playing`, `completed`, `abandoned`. Default al crear: `not_started`.

### Reglas

- Cada vez que el usuario quiere, inicia o reinicia un juego se crea un **nuevo** `Backlog`. No se reutilizan.
- El estado actual del usuario sobre un juego se deriva del backlog más reciente.
- `playCount` se calcula contando los backlogs del usuario sobre el juego.
- `userRating`: escala 0.5–5, paso de medio punto.
- `score` y `duration`: requeridos y positivos al crear.
- `realDuration`, `userRating`, `notes`, `startedAt`, `finishedAt`: nullable en update.
- `notes` se excluye de respuestas públicas siempre.
- Activity de cambio de status se emite solo cuando el status **realmente** cambia.

### Compilations

- `Backlog.compilationGameId` persiste el juego compilation al que pertenece la run.
- Se valida que el link child sea consistente con el `CompilationItem` correspondiente.

### Auto-comportamientos al cambiar status

- Pasar a `playing`, `completed` o `abandoned` **elimina la entrada del queue** si existía.
- La respuesta de update incluye `wishlistRemoved: true` cuando aplica.

---

## Queue

- Solo acepta backlogs en estado `not_started`. Cualquier otro estado se rechaza al añadir.
- Auto-remove al cambiar el status del backlog asociado fuera de `not_started`.
- Unique `(user_id, backlog_id)`.

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
- `position` única por `(list_id, position)`, sin huecos, reordenable.
- Si el creador edita o refresca una lista, todos los seguidores ven los cambios.
- Refrescar items reaplica score/duration desde la fuente declarada.

---

## Saved filters

- `isDefault`: solo una vista puede tenerlo en `true` por usuario. Setearla resetea las demás.
- `showInBacklog`: bandera para mostrar la vista en el listado lateral del backlog.
- Las vistas guardan filtros como JSONB; cualquier usuario puede construir la URL con query params equivalente y guardarla como bookmark del navegador.

---

## Reviews

- Una review por `(user, game)`.
- Solo se cuentan en contadores las reviews con `content` no vacío. Las rating-only son visibles pero no suman al "reviews count".
- Activity `game_reviewed` se emite tanto en create como en edit.
- La review expone `playthroughDuration` derivada del último backlog completado del autor sobre el juego.

---

## Scores y duraciones

### Tres niveles

- **`GameScore` + `GameTime` (catálogo global):** un registro por `(game_id, source)`. Sources soportadas: Metacritic, OpenCritic, RAWG, HLTB, Completr.
- **`GameShelf` (del usuario):** copia editable elegida por el usuario. Determina el ratio en su backlog.
- **`ListItem` (congelado en lista):** copiado desde la fuente declarada por la lista al añadir el juego. No editable manualmente — solo vía refresh o cambio de fuente.

### Precarga al crear un backlog

- Score: precarga desde `GameScore.source = "metacritic"` si existe.
- Duration: precarga desde `GameTime.source = "hltb"` si existe.
- El usuario puede sobrescribir antes de guardar.

### Datos crudos

- RAWG rating se almacena en escala 0–5; no se normaliza al persistir.
- La normalización a escala 100 ocurre al calcular ratios.

### Jobs de actualización masiva

- Solo `admin` puede dispararlos.
- `calculate-ratings` y `calculate-durations` exigen mínimo del **10% de usuarios** con dato para emitir score Completr.

---

## Ratio

- `ratio = GameShelf.score / GameShelf.duration` — escala 0–100, 2 decimales, `null` si falta alguno.
- `personalRatio = GameShelf.score / Backlog.realDuration` — desde el backlog completado con `realDuration`. Si hay varios, se elige el primero o el mejor.
- En `ListItem`, el ratio es `null` cuando la fuente declarada por la lista no tiene score o duration para ese juego.

---

## Privacidad

### Flags en `User`

`isPublic`, `isFeedPublic`, `isBacklogPublic`, `isShelfPublic`, `isListPublic`, `isWishlistPublic`, `isFavoritePublic`.

### Reglas

- `isPublic = false` actúa como switch maestro: nadie ve nada del usuario, sin importar los flags específicos.
- Cada flag específico controla la sección correspondiente del perfil público.
- **Self-view siempre permitida:** el propio usuario ve su perfil completo aunque sea privado.
- **Listas seguidas en perfil:** una entry es visible solo cuando `User.isPublic AND ListFollower.isVisible`.
- `notes` del backlog nunca aparecen en respuestas públicas, sin importar `isBacklogPublic`.
- `email` nunca se serializa en respuestas públicas.

---

## Activity feed

Eventos registrados:

- `backlog_not_started`, `backlog_playing`, `backlog_completed`, `backlog_abandoned`.
- `wishlist_added`, `shelf_added`.
- `user_followed`, `user_followed_by`.
- `list_created`, `list_followed`.
- `game_reviewed`.

Reglas:

- El feed incluye actividades propias del usuario consultante.
- Filtrado por `User.isFeedPublic` del autor de cada evento.
- Los eventos `backlog_*` solo se emiten cuando el status realmente cambia.

---

## Auth y sesiones

- Access token (JWT): TTL configurable, default 15 minutos.
- Refresh token: TTL configurable, default 30 días. Almacenado como HttpOnly cookie y como hash en DB.
- Rotación: cada refresh emite un access nuevo y reemplaza el refresh token.
- Multi-dispositivo: cada refresh token guarda `deviceInfo`, `createdAt`, `lastUsedAt`.
- Claim `sid` en el JWT trackea actividad por sesión.
- Email y username únicos, lowercased.

---

## Rate limiting

- Default: 300 requests/min por usuario autenticado.
- `admin` y `moderator` están exentos.
- Limites diferenciados por tipo de endpoint: público (más restrictivo), usuario (medio), auth (mínimo).

---

## Búsqueda de juegos

- Token-AND con normalización de puntuación y espacios.
- Accent-insensitive sobre títulos.
- Fallback a RAWG cuando no hay match local, salvo `local_only=true`. Importa hasta 3 resultados con detalle, excluye DLCs.
- `force_rawg=true` salta búsqueda local.
- `sort_by=random` disponible para discover.
