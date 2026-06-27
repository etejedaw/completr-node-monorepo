# Completr — Contexto del Proyecto

Este archivo cubre **el qué del producto**: visión, reglas de dominio, roles, monetización. Todo lo técnico (arquitectura, módulos, errores, providers, convenciones) vive en [`docs/`](./docs/README.md).

## Visión

Completr es una aplicación web tipo **Trakt, pero para videojuegos**. Permite a los usuarios gestionar su backlog de juegos, priorizarlos mediante un sistema de ratio (puntuación / duración) y hacer seguimiento semestral de los que quieren completar.

Nace de la necesidad de reemplazar una hoja de cálculo de Google donde el creador registra juegos por semestre con su plataforma, duración estimada (HowLongToBeat), nota promedio (Metacritic) y un ratio calculado para priorizar qué jugar primero.

---

## Conceptos clave del dominio

### Sistema de puntajes (3 niveles)

Los puntajes y tiempos viven en 3 lugares distintos según el contexto:

1. **`GameScore`** + **`GameTime`** — Catálogo global. `GameScore` almacena puntajes (Metacritic, OpenCritic, RAWG, Completr community). `GameTime` almacena duraciones (HLTB, RAWG, Completr community). Tablas separadas para evitar nulls. Cada una tiene UUID propio + unique index en (game_id, source). Actualizados por cron mensual. La ficha del juego muestra todos los disponibles. Los datos de RAWG se almacenan en crudo (ej: rating RAWG es escala 0-5, no se normaliza).
2. **`GameShelf`** — Datos del usuario. Al añadir un juego al backlog, se precarga el puntaje/duración de la fuente preferida. El usuario puede editarlo manualmente. Determina el ratio en el backlog.
3. **`ListItem`** — Datos congelados. Al añadir a una lista, se copia desde la fuente elegida. No editable manualmente — solo con "actualizar puntajes" o "elegir fuente". Las listas no permiten valores custom.

`Game` ya NO tiene `averageScore` ni `averagePlaytime` — los puntajes viven en `GameScore` y las duraciones en `GameTime`.

**Precarga de puntajes al crear backlog:** Al seleccionar un juego, el frontend precarga score (Metacritic preferido) y duration (HLTB preferido) desde los GameScore/GameTime del juego. El usuario puede editarlos antes de guardar.

**Actualización de scores:** Todos los usuarios pueden ver y usar scores de cualquier fuente al crear/editar manualmente. Además existe una actualización masiva en lote de scores y duraciones desde las fuentes disponibles.

### Ratio

```
ratio = GameShelf.score / GameShelf.duration
```

Mientras más alto el ratio, más "vale la pena" el juego (corto y bien puntuado). Ejemplo: Florence (82 pts, 1h) = ratio 82.00 vs Crash Bandicoot (82 pts, 6h) = ratio 13.67.

El score y la duration dependen de lo que el usuario eligió en su GameShelf (puede venir de Metacritic, OpenCritic, Completr community, o un valor manual).

### Ratio Personal

```
personal_ratio = GameShelf.score / Backlog.real_duration
```

Se calcula desde el `Backlog` completado. Si hay múltiples backlogs completados, se usa el primero o el mejor. Permite comparar la estimación con la experiencia personal.

### Filtros y vistas guardadas (SavedFilter)

El backlog soporta filtros completos por: status (uno o varios comma-separated, ej: `completed,abandoned`), game_id, platform_id, rangos de fechas (started_from/to, finished_from/to), no_finished_date (bool, filtra entradas sin fecha de finalización), rangos numéricos (min/max_score, min/max_duration, min/max_rating) y ordenamiento (sort_by + sort_order). Cualquier combinación de filtros se puede guardar como vista con nombre y descripción opcional (ej: "Completados 2025-S01"). El backend almacena los filtros como JSONB y el frontend los aplica como query params al consultar el backlog. Las vistas son una conveniencia — cualquier usuario puede construir la URL con query params y guardarla como bookmark.

### Wishlist y Favorites

Dos módulos independientes que reemplazan el concepto original de "listas por defecto". No son listas (`List`) — son marcas personales ligeras sobre juegos.

**Wishlist** — Cola priorizada de juegos que el usuario quiere jugar. Apunta a `Backlog` (no a `Game`) porque es sobre runs específicas. Un juego puede aparecer varias veces (ej: RE4 en difícil y en profesional).

- Modelo: `Wishlist(id, user_id, backlog_id, position, added_at)` — Unique `(user_id, backlog_id)`
- POST con `?source=game`: crea backlog `not_started` + wishlist entry en transacción
- POST con `?source=backlog`: añade backlog existente a la wishlist
- PUT: reemplaza array completo de `backlogIds` (posición por orden)
- Auto-remove: al cambiar backlog a `playing`, `completed` o `abandoned`, se elimina de la wishlist (el Queue solo contiene runs en estado `not_started`)

**Favorites** — Juegos que el usuario marca como favoritos. Apunta a `Game` (no requiere backlog). Puedo marcar un juego como favorito sin haberlo jugado.

- Modelo: `Favorite(id, user_id, game_id, position, added_at)` — Unique `(user_id, game_id)`
- PUT: reemplaza array completo de `gameIds` (posición por orden)

**Visibilidad:** Controlada desde `User` con `isWishlistPublic` y `isFavoritePublic` (boolean, default true). No hay flag por entry individual.

### Estados de un juego

4 estados posibles en `Backlog`:

- **No Iniciado** (`not_started`) — el usuario quiere jugar este juego pero aún no empezó
- **Jugando** (`playing`) — en progreso
- **Completado** (`completed`) — terminado, con fecha de finalización
- **Abandonado** (`abandoned`) — dejado, opcionalmente con motivo en notas

### Backlogs (modelo inspirado en Trakt)

`Backlog` es la tabla central de tracking. Contiene todo el historial del usuario:

- Cada vez que el usuario quiere jugar, inicia o reinicia un juego, se crea un nuevo backlog
- Tiene su propio status, fechas, duración real, plataforma y notas
- Permite comparar experiencias: "lo completé en 8h en PSX, después en 5h en Steam"
- El estado actual de un juego se deriva del backlog más reciente
- El `play_count` se calcula: `COUNT(backlogs) WHERE gameId AND userId`

**Flujo:**

1. Usuario quiere jugar RE4 → se crea `Backlog(#1, not_started)`
2. Lo empieza → `Backlog(#1, playing)`
3. Lo completa → `Backlog(#1, completed)`
4. Un año después lo rejuega → se crea `Backlog(#2, playing)` (play_count ahora es 2)
5. Lo completa de nuevo → `Backlog(#2, completed)`

### Vistas vs Listas

Concepto clave derivado del flujo actual en NocoDB:

**Vistas** = filtros sobre `Backlog`. NO son listas separadas:

- "Pendientes" → `Backlog` where status = `not_started`
- "Jugando" → `Backlog` where status = `playing`
- "Completados" → `Backlog` where status = `completed`
- "Semestre 2025-S01" → `Backlog` where `finished_at` entre ene-jun 2025

**Listas** = colecciones curadas de juegos con puntajes de una fuente oficial (estilo Trakt). Cualquier usuario o Completr (como cuenta oficial) puede crear listas. Ejemplos: "Saga Resident Evil", "Mis TOP 10 favoritos", "RPGs cortos sub-5h".

**Datos de una lista:**

- Nombre, descripción, pública/privada
- Fuente global de score y duration (metacritic, opencritic, rawg, hltb, etc.) — no valores custom
- Score/duration de cada juego se copian desde GameScore/GameTime al ListItem
- Ratio calculado por juego (`score / duration`). Si la fuente no tiene dato → null
- Posición por juego (unique dentro de la lista, sin huecos, reordenable)
- Contador de seguidores

**Interacción con una lista:**

- Al ver una lista autenticado, el backend incluye el estado del juego en tu backlog (`backlogStatus`: completed, playing, not_started, abandoned, o null si no está en tu backlog)
- El frontend muestra íconos de estado y calcula estadísticas (ej: "has completado 8/15")
- Para añadir un juego a tu backlog, vas a la ficha del juego y lo añades desde ahí
- Si el creador edita/refresca la lista, todos ven los cambios

**Seguir una lista (bookmark social):**

- `POST /lists/:id/follow` para seguir una lista pública
- La lista aparece en tu perfil y otros usuarios ven que la sigues
- `isVisible` controla si el follow aparece en tu perfil público
- No modifica la lista ni tu backlog — es solo un marcador de acceso rápido y señal social

### Semestres

No existe un campo "semestre" en el modelo. El semestre se deriva de `Backlog.finished_at`: ene-jun = S01, jul-dic = S02. Las vistas semestrales son filtros por rango de fechas.

---

## Separación conceptual de módulos

Los módulos del backend reflejan distintos pedazos del dominio. Esta tabla es la vista de producto — la organización técnica de cada módulo vive en [`docs/context/modules.md`](./docs/context/modules.md).

| Módulo           | Propósito                                                                      | Analogía                   |
| ---------------- | ------------------------------------------------------------------------------ | -------------------------- |
| `games`          | Catálogo global de juegos (admin lo alimenta)                                  | La tienda de juegos        |
| `game-shelf`     | Juegos que **posee** el usuario con datos personales                           | Tu estantería física       |
| `lists`          | Colecciones curadas de juegos con puntajes de fuente oficial                   | Listas temáticas o sagas   |
| `list-items`     | Items de lista con score/duration congelados y posición                        | Juegos dentro de una lista |
| `list-followers` | Suscripción a listas públicas de otros usuarios                                | "Seguir esta lista"        |
| `backlogs`       | Historial completo del usuario (quiere jugar, jugando, completado, abandonado) | Tu diario de gaming        |
| `wishlist`       | Cola priorizada de runs que el usuario quiere jugar (apunta a backlog)         | Tu lista de "siguiente"    |
| `favorites`      | Juegos marcados como favoritos (apunta a game, sin backlog requerido)          | Tus juegos favoritos       |

- Un juego puede estar en `game-shelf` sin estar en ninguna lista
- Un juego puede estar en múltiples listas
- `game-shelf` tiene datos de colección: `notes`, `acquired_at`, `edition`
- Las listas tienen puntajes de fuente oficial (no custom). Todos ven los mismos puntajes congelados desde la fuente elegida por el creador
- Las "vistas" (pendientes, jugando, semestre X) son filtros de API sobre `Backlog`, no listas

### Privacidad en dos niveles

1. **Perfil** (`User.isPublic`): Si `false`, nadie ve nada del usuario — muro total
2. **Por lista seguida** (`ListFollower.isVisible`): Si `false`, el seguimiento no aparece en el perfil público del usuario

- Regla: `visible = User.isPublic AND ListFollower.isVisible`
- Ejemplo: perfil público + sigo "Visual Novels" con `isVisible: false` → la sigo y veo mi progreso, pero nadie más lo sabe

---

## Roles de usuario

| Rol         | Permisos                                           |
| ----------- | -------------------------------------------------- |
| `user`      | Gestión de su propio perfil, game-shelf y listas   |
| `premium`   | Todo lo de user + features premium (futuro)        |
| `moderator` | Todo lo de user + CRUD de games, platforms, genres |
| `admin`     | Acceso total                                       |

---

## Público objetivo

### Fase inicial

- El propio creador (dogfooding)
- Amigos cercanos que juegan videojuegos

### Beta pública

- Gamers que mantienen backlogs grandes
- Usuarios de HowLongToBeat que quieren priorizar
- Comunidad de completistas

### Largo plazo

- Usuarios casuales que quieren organizar qué jugar
- Comunidad social de gamers (estilo Trakt/Letterboxd pero para juegos)

---

## Filosofía de monetización

Inspirada en Trakt:

> _"Si te gusta Completr, esta versión es para apoyar el proyecto."_

- Plan gratuito generoso (funcionalidad completa de backlog)
- Premium como apoyo, no como paywall agresivo

---

## Integraciones planeadas

| Servicio               | Propósito                                         | Estado       |
| ---------------------- | ------------------------------------------------- | ------------ |
| RAWG API               | Géneros, descripciones, covers, scores, playtimes | Implementado |
| HowLongToBeat          | Duración estimada de juegos                       | Fase 1       |
| Metacritic/OpenCritic  | Puntuación promedio                               | Fase 1       |
| Steam API              | Sincronización de librería                        | Fase 6       |
| Stripe/LemonSqueezy    | Pagos Premium                                     | Fase 6       |
| SMTP (Resend/SendGrid) | Emails transaccionales                            | Fase 5       |
