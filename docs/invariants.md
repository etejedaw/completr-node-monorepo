# Invariantes

Lo que el código hace cumplir, en forma atómica: enums, constraints, validaciones, códigos de error, nombres de eventos y comportamientos automáticos.

**Este archivo describe el mecanismo, no la decisión.** El _qué_ y el _por qué_ de cada regla de negocio viven en AFFiNE (docs `Reglas de negocio` y `Premium`) — ver [`../CLAUDE.md`](../CLAUDE.md) para los ids. Si buscas cuántas listas puede tener un usuario free o qué significa cada estado, está allá. Si buscas cómo se llama el enum o qué status devuelve la API al exceder el tope, está aquí.

Arquitectura en [`architecture.md`](./architecture.md), endpoints en [`api/`](./api/).

---

## Roles

Enum `User.role` en `src/users/user-role.type.ts`: `user`, `premium`, `moderator`, `admin`. Default al registrarse: `user`.

- El gating premium se resuelve con `isPremium()`, que acepta `premium`, `moderator` y `admin`.
- La matriz de permisos por rol vive en el doc `Premium` de AFFiNE.

---

## Límites por usuario

Los recursos con tope por rol son `lists`, `list-items`, `saved-filters`, `favorites`, `wishlist` y `queue`. Los valores de cada tope viven en el doc `Premium` de AFFiNE, no aquí.

- Exceder el tope devuelve **`402`**, mapeado en el `domain-to-http.mapper.ts` de cada módulo.
- `lists`, `list-items` y `saved-filters` implementan además el estado **frozen**: estando sobre el tope, create y update lanzan `frozenError()`; delete sigue permitido y lo existente se sigue sirviendo. Nada se borra automáticamente.
- Los listados de `lists` y `saved-filters` devuelven un flag `frozen` en la respuesta para que el frontend lo refleje.

---

## Backlog

### Estados

Enum `Backlog.status`: `not_started`, `playing`, `completed`, `abandoned`, `endless`. Default al crear: `not_started`. El significado de cada uno está en `Reglas de negocio` (AFFiNE).

- `endless` se agrupa con `completed` y `abandoned` en los cálculos de progreso de franquicias y listas.
- En filtros por actividad, `endless` se trata como activo junto a `playing`: `finishedAt` se coalesce a `CURRENT_DATE`.

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

- Pasar a `playing`, `completed`, `abandoned` o `endless` **elimina la entrada del queue** si existía.
- La respuesta de update incluye `queueRemoved: true` cuando aplica.

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

- **`GameScore` + `GameTime` (catálogo global):** un registro por `(game_id, source)`. Tablas separadas para evitar nulls; cada una con UUID propio. Sources soportadas: Metacritic, OpenCritic, RAWG, HLTB, Completr.
- **`GameShelf` (del usuario):** copia editable elegida por el usuario. Determina el ratio en su backlog.
- **`ListItem` (congelado en lista):** copiado desde la fuente declarada por la lista al añadir el juego. No editable manualmente — solo vía refresh o cambio de fuente.

`Game` no tiene `averageScore` ni `averagePlaytime`: los puntajes viven en `GameScore` y las duraciones en `GameTime`.

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

Fórmulas y comportamiento en bordes. El porqué del ratio está en `Reglas de negocio` (AFFiNE).

- `ratio = GameShelf.score / GameShelf.duration` — escala 0–100, 2 decimales, `null` si falta alguno.
- `personalRatio = GameShelf.score / Backlog.realDuration` — desde el backlog completado con `realDuration`. Si hay varios, se elige el primero o el mejor.
- En `ListItem`, el ratio es `null` cuando la fuente declarada por la lista no tiene score o duration para ese juego.

---

## Privacidad

### Campos en `User`

Ocho secciones independientes, cada una con un `VisibilityLevel` (`src/users/constants/visibility.constants.ts`): `private`, `friends`, `public`.

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

Toda la lógica vive en `canView(viewerId, owner, section)` en `src/users/helpers/visibility.helper.ts`, en este orden:

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
