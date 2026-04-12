# 🎮 Completr — Roadmap Unificado

> **Principio arquitectónico clave:** `Backlog` es un módulo independiente que almacena todo el historial del usuario (not_started, playing, completed, abandoned). Las "vistas" (pendientes, jugando, completados, por semestre) son filtros sobre `Backlog`, no listas separadas. Las listas (`List`) son colecciones curadas de juegos con puntajes de fuente oficial — sagas, temáticas, tops. Un juego puede estar en `Backlog` sin estar en ninguna lista, y en varias listas a la vez. `game-shelf` registra los juegos que el usuario posee (colección física/digital).

---

## 📆 Resumen cronológico

| Mes   | Etapa                                                | Release  |
| ----- | ---------------------------------------------------- | -------- |
| 1     | Fase 0 — Setup y arquitectura                        | `v0.1.0` |
| 2–3   | Fase 1 — Excel Killer (solo tú)                      | `v0.2.0` |
| 3–4   | Fase 1.5 — Beyond the Spreadsheet (mejoras + deploy) | `v0.2.x` |
| 4–5   | Fase 2 — MVP Amigos (5–20 personas)                  | `v0.3.0` |
| 5–7   | Fase 3 — Beta Cerrada (50–200 usuarios, invitación)  | `v0.4.0` |
| 7–10  | Fase 4 — Beta Pública (500+ usuarios)                | `v1.0.0` |
| 10–11 | Fase 5 — Estabilización y calidad                    | `v1.1.0` |
| 11–13 | Fase 6 — Premium (desarrollo + lanzamiento)          | `v2.0.0` |
| 13+   | Fase 7 — Escalamiento continuo                       | `v2.x.x` |

---

## 🟩 FASE 0 — Diseño y Setup _(~2–3 semanas)_

**Objetivo:** Base técnica sólida y arquitectura limpia antes de escribir lógica de negocio.

### Arquitectura y configuración base

- [x] Definir estructura de módulos del proyecto (`auth`, `users`, `games`, `game-shelf`, `lists`, `list-items`, `platforms`, `genres`, `common`, `database`, `integrations`)
- [x] Configurar Express + TypeScript + Sequelize + Zod
- [x] Configurar variables de entorno con validación (`environment.config.ts`)
- [x] Configurar CORS, Helmet, Rate Limiting
- [x] Implementar logger centralizado con Pino
- [x] Implementar manejo centralizado de errores (domain errors → HTTP errors)
- [x] Implementar middleware de correlación de IDs para trazabilidad
- [x] Configurar patrón Serializer en todos los módulos (el frontend nunca calcula, solo recibe datos ya procesados, ej: `ratio: 8.5`)

### Modelos de base de datos

- [x] **User**: id (UUID), username, email, password_hash, steam_id (nullable), avatar_url, role, created_at
- [x] **Game**: id (UUID), title, slug, description (TEXT), cover_url, release_at, is_dlc, parent_game_id (self-reference nullable para DLCs), is_active, created_at — scores y times viven en `GameScore`/`GameTime`
- [x] **Platform**: id (UUID), name, slug, code
- [x] **Genre**: id (UUID), name, slug, code
- [x] **GamePlatform**: game*id, platform_id *(tabla pivote)\_
- [x] **GameGenre**: game_id, genre_id (tabla pivote)
- [x] **GameScore**: id (UUID), game_id, source (`metacritic` | `opencritic` | `rawg` | `completr`), score (number), updated_at — Puntajes globales por fuente. Unique index en (game_id, source). Datos en crudo (RAWG usa escala 0-5). Actualizado por cron mensual
- [x] **GameTime**: id (UUID), game_id, source (`hltb` | `rawg` | `completr`), duration (number), updated_at — Tiempos globales por fuente. Unique index en (game_id, source). Actualizado por cron mensual
- [x] **GameShelf**: id, user_id, game_id, platform_id, is_public, acquired_at, edition, notes — Colección de juegos que el usuario posee. Sin score/duration (esos viven en ListItem)
- [x] **List**: id (UUID), user_id, name, description (nullable), is_public (bool), score_source (enum), duration_source (enum), created_at — Colecciones curadas de juegos con puntajes de fuente oficial. Free: hasta 5 listas, premium/admin: ilimitado
- [x] **ListItem**: id, list_id, game_id, position (int, unique dentro de lista), score (nullable), duration (nullable) — Puntajes congelados desde la fuente oficial de la lista
- [x] **SavedFilter**: id (UUID), user_id, name, description (nullable, max 255), filters (JSON), sort_by (nullable), sort_order, created_at — Filtros guardados del backlog. Free: hasta 5, Premium: ilimitados
- [x] **ListFollower**: id, list*id, user_id, is_visible (bool, default true — controla si el seguimiento aparece en el perfil público del usuario), followed_at — \_Permite a usuarios seguir listas públicas de otros. El progreso se calcula cruzando los juegos de la lista con el `Backlog` del seguidor. Visibilidad: `User.isPublic AND ListFollower.isVisible`*
- [x] **Backlog**: id (UUID), user_id, game_id, platform_id, status (`not_started` | `playing` | `completed` | `abandoned`), started_at, finished_at (nullable), real_duration (nullable), notes (nullable) — Historial completo del usuario. Incluye juegos que quiere jugar, está jugando, completó o abandonó. El play_count y el estado actual se derivan de esta tabla. El número de backlog se calcula en el serializer ordenando por `started_at`
- [x] Definir todas las asociaciones en `associations.database.ts` con Foreign Keys explícitamente tipadas como UUID

### Auth

- [x] Registro con validación de política de contraseñas (Zod)
- [x] Login con JWT (access token) + Refresh tokens
- [x] Middleware de autenticación (`auth.middleware.ts`)
- [x] Schemas de validación: `login.schema.ts`, `register.schema.ts`, `header-token.schema.ts`, `change-password.schema.ts`

### Error handling por módulo

- [x] `auth` — Patrón completo: ServiceError → DomainError → HttpError con normalizers y mappers
- [x] `users` — Patrón completo: ServiceError → DomainError → HttpError con normalizers y mappers
- [x] `games` — Patrón completo: ServiceError → DomainError → HttpError con normalizers y mappers
- [x] `platforms` — Patrón completo: ServiceError → DomainError → HttpError con normalizers y mappers
- [x] `genres` — Patrón completo: ServiceError → DomainError → HttpError con normalizers y mappers
- [x] `game-shelf` — Patrón completo: ServiceError → DomainError → HttpError con normalizers y mappers
- [x] Registrar `games`, `platforms`, `genres` y `game-shelf` en `global-error-domain.normalizer.ts` y `global-error-http.normalizer.ts`
- [x] Corregir `games.service.ts` — reemplazado `platformDomainError.platformNotFound()` por `gamesServiceError.platformNotFoundError()`
- [x] Agregar validación `z.uuid()` en todos los schemas de params que reciben IDs (Zod v4 usa `z.uuid()`, no `z.string().uuid()`)

### Correcciones de rutas

- [x] Corregir rutas de géneros: `PATCH /platform/:id` → `PATCH /genre/:genreId`, `DELETE /platform/:id` → `DELETE /genre/:genreId`
- [x] Agregar validación de `GenreIdParamSchema` en `PATCH /genre/:genreId`

### Refactor auth services

- [x] Mover `password.service.ts` y `token.service.ts` a `src/auth/services/`
- [x] Actualizar imports en `auth.service.ts` y `auth.middleware.ts`

### Providers

- [x] RAWG provider (`src/rawg/`): clase `RawgProvider` con `searchGame(query, filters)`, `getGameById(id)`, `getGameBySlug(slug)`. Soporta filtros por fecha, plataforma, género, metacritic, ordenamiento y exclusión de DLCs.

### Refactor Express 5: `request.locals`

- [x] Reemplazar `CustomRequest` por `request.locals` (declaration merging en `Express.Request`)
- [x] Crear `src/common/types/express.d.ts` con `declare namespace Express { interface Request { locals: Record<string, unknown> } }`
- [x] Crear `src/common/interfaces/request-user.interface.ts` (`RequestUser`)
- [x] Eliminar `src/common/interfaces/custom-request.interface.ts`
- [x] Actualizar `validate-schema.middleware.ts`: escribe datos validados en `request.locals[requestKey]`
- [x] Actualizar `auth.middleware.ts`: escribe usuario en `request.locals.user`
- [x] Actualizar `correlation-id.middleware.ts`, `error-handler.middleware.ts`, `logger.middleware.ts`
- [x] Actualizar todos los controllers: `request.locals.body`, `request.locals.params`, `request.locals.query`, `request.locals.user as RequestUser`
- [x] Actualizar todos los domain-to-http mappers: `Request` en vez de `CustomRequest`, `request.locals?.correlationId`
- [x] Actualizar `global-error-http.normalizer.ts`: parámetro `Request` en vez de `CustomRequest`
- [x] Agregar `"files": ["src/common/types/express.d.ts"]` en `tsconfig.json` para que ts-node reconozca la declaration merging
- [x] Probar todos los endpoints con los 4 roles + sin auth (vistas, filtros, CRUD saved-filters, permisos, errores)

### Configuración

- [x] Separar variables de entorno en: `environment.config.ts`, `database.config.ts`, `api-keys.config.ts`

### Seed / datos iniciales

- [x] Cargar plataformas iniciales via API (`POST /platform`): 35 plataformas (Sony, Microsoft, Nintendo, Sega, PC stores, mobile)
- [x] Cargar géneros iniciales via API (`POST /genre`): 38 géneros (Action, RPG, FPS, Survival Horror, Metroidvania, etc.)
- [x] Cargar 517 juegos via API con datos de RAWG: descripciones, covers, fechas de lanzamiento, géneros vinculados, isDlc
- [x] Cargar scores Metacritic (517) y RAWG (494) via `POST /game-scores`
- [x] Cargar tiempos HLTB (517) y RAWG (398) via `POST /game-times`

---

## 🟨 FASE 1 — Excel Killer _(~4–6 semanas)_

**Objetivo:** Reemplazar NocoDB/Google Sheets. Importar tus datos, ver ratios calculados, filtrar por status y semestre.
**Condición de éxito:** Puedes importar tu CSV, ver la lista ordenada por ratio, filtrar por semestre y trackear backlogs.

> 👤 _Release interna — solo tú lo usas._

### Módulo de Juegos (catálogo global)

- [x] `POST /games` — Crear juego (solo admin/owner)
- [x] `GET /games` — Listar juegos con búsqueda básica y filtros por plataforma/género
- [x] `GET /games/:id` — Detalle de juego
- [x] `PATCH /games/:id` — Editar juego
- [x] `DELETE /games/:id` — Eliminar juego
- [x] Serializer de juego con scores[], times[], genres[], platforms[] y ratio canónico (completr score / completr time)
- [x] Endpoints GET públicos (sin auth, solo rate limit)
- [x] Schemas de validación: `register-game.schema.ts`, `update-game.schema.ts`, `game-code-params.schema.ts`, `game-id-params.schema.ts`

### Módulo de Game Shelf (librería del usuario)

- [x] `POST /users/me/game-shelf` — Añadir un juego a la colección
- [x] `GET /users/me/game-shelf` — Ver mi colección completa
- [x] `PATCH /users/me/game-shelf/:id` — Actualizar edición, notas, fecha de adquisición
- [x] `DELETE /users/me/game-shelf/:id` — Quitar juego de la colección (borrado físico)
- [x] `GET /users/:username/game-shelf` — Ver colección pública de otro usuario (respeta User.isPublic + GameShelf.isPublic)
- [x] Serializers (full, me, tiny) con datos de colección (sin score/duration, esos viven en ListItem)

### Módulo de Backlog

- [x] `POST /users/me/backlog` — Crear entrada de backlog (status por defecto: `not_started`)
- [x] `PATCH /users/me/backlog/:backlogId` — Actualizar status, `realDuration`, `finishedAt`, `userRating`, `isPublic`, `notes`
- [x] `GET /users/me/backlog` — Ver mi historial con filtros completos (status, game_id, platform_id, rangos de fechas, duración, rating, ordenamiento)
- [x] `GET /users/:username/backlog` — Ver backlog público de otro usuario (respeta `User.isPublic` + `Backlog.isPublic`)
- [x] `DELETE /users/me/backlog/:backlogId` — Eliminar entrada (borrado físico, solo owner)
- [x] `userRating` — Nota personal del 1 al 10 en pasos de 0.5
- [x] Serializer con game y platform incluidos
- [x] Error handling completo registrado en normalizers globales (404, 403, 400, 500)

### Vistas (filtros sobre backlog)

> Las "vistas" no son listas separadas — son query filters sobre `Backlog`. Replican el comportamiento actual de NocoDB donde las vistas son filtros sobre la misma tabla.

- [x] `GET /users/me/backlog?status=not_started` — Vista "Pendientes"
- [x] `GET /users/me/backlog?status=playing` — Vista "Jugando"
- [x] `GET /users/me/backlog?status=completed` — Vista "Completados"
- [x] `GET /users/me/backlog?status=abandoned` — Vista "Abandonados"
- [x] `GET /users/me/backlog?status=completed,abandoned` — Multi-status comma-separated
- [x] `GET /users/me/backlog?no_finished_date=true` — Filtrar entradas sin fecha de finalización
- [x] `GET /users/me/backlog?finished_from=2025-01-01&finished_to=2025-06-30` — Vista por semestre
- [x] Filtros por rango: `min_score/max_score`, `min_duration/max_duration`, `min_rating/max_rating`, `started_from/to`, `finished_from/to`
- [x] Filtro por plataforma: `?platform_id=uuid`
- [x] Ordenamiento: `?sort_by=userRating&sort_order=desc`
- [x] Soportar combinación de cualquier filtro + ordenamiento

### Módulo de Saved Filters (vistas guardadas)

- [x] `POST /users/me/saved-filters` — Crear vista guardada (preset de filtros + ordenamiento)
- [x] `GET /users/me/saved-filters` — Listar mis vistas guardadas
- [x] `PATCH /users/me/saved-filters/:filterId` — Actualizar vista (solo owner)
- [x] `DELETE /users/me/saved-filters/:filterId` — Eliminar vista (solo owner)
- [x] Límite de 5 vistas para usuarios free, ilimitadas para premium/admin
- [x] Filtros almacenados como JSONB — el frontend los lee y los aplica como query params al backlog
- [x] Campo `description` opcional (max 255) para describir la vista
- [x] Serializer que oculta `createdAt`/`updatedAt` de la respuesta
- [x] Error handling completo registrado en normalizers globales (404, 403 forbidden, 403 limit reached, 500)

### Módulo de Listas

#### CRUD de listas

- [x] `POST /lists` — Crear lista (nombre, descripción, is_public, score_source, duration_source)
- [x] `GET /lists/me` — Ver mis listas + frozen flag
- [x] `GET /lists/:id` — Ver detalle de una lista con items, puntajes y ratios
- [x] `PATCH /lists/:id` — Editar nombre, descripción, visibilidad, fuente de puntajes (solo owner)
- [x] `DELETE /lists/:id` — Eliminar lista (solo owner)
- [x] Error handling completo registrado en normalizers globales (404, 403, 409, 400, 500)

#### Items de lista

- [x] `PUT /lists/:id/items` — Reemplaza el array completo de gameIds en orden. Score/duration se congelan desde GameScore/GameTime según la fuente de la lista. Si la fuente no tiene dato → null. Acepta array vacío para limpiar la lista
- [x] Validación: gameIds deben existir en DB, no se permiten duplicados
- [x] Ratio calculado en serializer (`score / duration`)
- [x] Error handling completo registrado en normalizers globales (404, 403, 422, 500)
- [x] `POST /lists/:id/refresh-scores` — Actualizar puntajes de todos los items desde la fuente (solo owner)

#### Límite de listas para free

- [x] Free: hasta 5 listas, premium/admin: ilimitado
- [x] Frozen state: si un usuario baja de premium con >5 listas, no puede crear ni editar hasta que elimine las sobrantes
- [x] Error handling: 402 `LIST_LIMIT_REACHED` y `LIST_FROZEN` / `LIST_ITEM_FROZEN`

### Módulo de Wishlist

> La wishlist es una cola priorizada de runs que el usuario quiere jugar. Apunta a `Backlog` (no a `Game`) porque permite runs específicas (ej: RE4 en difícil y en profesional). No es una lista (`List`) — es un módulo independiente.

- [x] Modelo `Wishlist`: id (UUID), user_id, backlog_id, position (int), added_at — Unique index `(user_id, backlog_id)`
- [x] `POST /users/me/wishlist?source=game` — Body: `{ id, platformId }`. Crea backlog `not_started` + wishlist entry en transacción
- [x] `POST /users/me/wishlist?source=backlog` — Body: `{ id }`. Valida ownership, añade a wishlist
- [x] `PUT /users/me/wishlist` — Body: `{ backlogIds: [...] }`. Reemplaza array completo, posición por orden del array
- [x] `GET /users/me/wishlist` — Mi wishlist ordenada por posición
- [x] `GET /users/:username/wishlist` — Wishlist pública (respeta `User.isPublic` + `User.isWishlistPublic`)
- [x] Auto-remove: cuando un backlog cambia a `completed` o `abandoned`, eliminarlo de la wishlist automáticamente
- [x] Límite: 10 free, ilimitado premium/admin
- [x] Error handling completo registrado en normalizers globales
- [x] Campo `isWishlistPublic` (boolean, default true) en modelo `User`

### Módulo de Favorites

> Favorites son juegos que el usuario marca como favoritos. Apunta a `Game` (no requiere backlog). Puedo marcar un juego como favorito sin haberlo jugado. No es una lista (`List`) — es un módulo independiente.

- [x] Modelo `Favorite`: id (UUID), user_id, game_id, position (int), added_at — Unique index `(user_id, game_id)`
- [x] `PUT /users/me/favorites` — Body: `{ gameIds: [...] }`. Reemplaza array completo, posición por orden del array
- [x] `GET /users/me/favorites` — Mis favoritos ordenados por posición
- [x] `GET /users/:username/favorites` — Favoritos públicos (respeta `User.isPublic` + `User.isFavoritePublic`)
- [x] Límite: 10 free, ilimitado premium/admin
- [x] Error handling completo registrado en normalizers globales
- [x] Campo `isFavoritePublic` (boolean, default true) en modelo `User`

#### Seguir una lista (bookmark social)

- [x] `POST /lists/:id/follow` — Seguir una lista pública (solo listas con `isPublic: true`)
- [x] `DELETE /lists/:id/follow` — Dejar de seguir
- [x] `isVisible` controla si el follow aparece en el perfil público del usuario
- [x] La lista muestra contador de seguidores
- [x] No modifica la lista ni el backlog — solo bookmark + señal social
- [x] Error handling completo registrado en normalizers globales (404, 403, 409, 500)

#### Backlog status en listas

- [x] `GET /lists/:id` incluye `backlogStatus` por juego cuando el usuario está autenticado
- [x] `backlogStatus`: estado del backlog más reciente del usuario para ese juego (`completed`, `playing`, `not_started`, `abandoned`, o `null` si no está en su backlog)
- [x] `followerCount` y `isFollowing` incluidos en la respuesta
- [x] Auth opcional: sin token se ve la lista sin backlogStatus ni isFollowing

### Módulo de Usuarios (perfil)

- [x] `GET /users/me` — Ver mi perfil
- [x] `PATCH /users/me` — Editar datos básicos (username, avatar_url)
- [x] `PATCH /auth/password` — Cambiar contraseña
- [x] Serializer de usuario (nunca expone `password_hash`)

### Cálculo del Ratio

- [x] `ratio = score / duration` calculado en el serializer de backlog (redondeado a 2 decimales)
- [x] `score` y `duration` son campos obligatorios y positivos en backlog (precargados al crear, editables por el usuario)
- [x] Ratio canónico en game serializer (completr score / completr time)

### Búsqueda con fallback a RAWG

- [x] `GET /games/search?query=...` — Endpoint de búsqueda separado de `GET /games`
- [x] Si la búsqueda local devuelve 0 resultados, hacer fallback a RAWG
- [x] Buscar en RAWG con el provider existente (`RawgProvider.searchGame`)
- [x] Si RAWG encuentra resultados, crear el juego en DB con todos sus datos (cover, descripción, géneros, scores, playtimes, plataformas)
- [x] Mapper `rawgToGameMapper` convierte datos de RAWG a `RegisterGameDto` + enrichment
- [x] Mapeo de plataformas RAWG → Completr (`rawg-platform.map.ts`)
- [x] Si RAWG tampoco encuentra → retornar array vacío
- [x] Crear tabla `GameExternal` para mapear juegos a sus IDs en plataformas externas (RAWG, IGDB, Steam, HLTB, Metacritic). Permite detectar duplicados por ID externo en vez de slug, y facilita futuras integraciones con cron
- [x] Almacenar múltiples resultados de RAWG (hasta 3, con detalle completo, `exclude_additions: true`). Usa GameExternal para evitar duplicados

### Transacciones en operaciones multi-paso

- [x] Refactorizar `games.service.ts → registerGame` para usar transacción (crea juego + plataformas + scores + times + géneros atómicamente)

### Pruebas manuales de endpoints

- [x] Ejecutar pruebas de todos los endpoints con los 4 roles (admin, moderator, premium, user) + sin auth
- [x] Verificar: permisos, validaciones, duplicados, not found, soft delete, serializers, datos derivados
- [x] Corregir cualquier bug encontrado antes de avanzar al frontend

### UI básica

- [x] Frontend con Angular (repo separado: `completr-node-frontend`)
- [x] Configurar como PWA (`@angular/pwa`): service worker, manifest, instalable en móvil
- [x] Vista de tabla del backlog en frontend con CRUD completo (crear, editar, eliminar via modal)
- [x] Búsqueda de juegos con fallback a RAWG, force search, precarga de scores/duration
- [x] Ordenamiento y filtrado básico en el frontend (status tabs, sort por columnas, búsqueda local)
- [x] ScoreSource: tabla de referencia con escalas por fuente, endpoint `GET /score-sources` público
- [x] GameScore.source refactorizado de ENUM a STRING con FK a ScoreSource
- [x] `backgroundUrl` en Game para RAWG images, `coverUrl` reservado para covers reales
- [x] Registro restringido a admin, hard delete de games con CASCADE
- [x] RAWG mapper: rating RAWG, expansión pc→tiendas, mapeo de géneros
- [x] Backlog update nullable: startedAt, finishedAt, realDuration, userRating, notes

---

## 🟨 FASE 1.5 — Beyond the Spreadsheet _(~3–4 semanas)_

**Objetivo:** Mejorar la experiencia más allá del backlog. Agregar las demás vistas, filtros avanzados y deploy.
**Condición de éxito:** Todas las features de gestión personal funcionan y la app está desplegada en el VPS.

> 👤 _Sigue siendo solo tú, pero con una experiencia más completa._

### Backend

- [ ] Agregar sort_by `title` (campo de Game, requiere order por relación en Sequelize) y `ratio`/`personalRatio` (campos calculados) al backend para soportar saved filters correctamente

### Frontend — Vistas pendientes

- [ ] Generar las vistas de los endpoints actuales

### Deploy inicial (VPS)

- [ ] Crear base de datos `completr` en PostgreSQL del VPS
- [ ] Cambiar default de `PG_DATABASE` a `completr` en `database.config.ts` y en `docker-compose`
- [ ] Configurar variables de entorno en la instancia del backend
- [ ] Migrar base de datos desde local al VPS

---

## 🟧 FASE 2 — MVP Amigos _(~3–4 semanas)_

**Objetivo:** Que tus amigos puedan crear cuenta, importar sus juegos y que se vean mutuamente.
**Condición de éxito:** Un amigo puede registrarse, ver tu perfil, ver qué estás jugando, y tú puedes ver su progreso en una lista.

> 👥 _Release privada — 5 a 20 amigos y conocidos._

### Panel admin de juegos

- [x] `PATCH /games/:id` — Permitir editar título (con regeneración de slug)
- [x] `GET /games/rawg-lookup?query=` — Buscar en RAWG sin crear juegos (solo admin/moderator)
- [x] `GET /games/rawg-detail/:rawgId` — Obtener detalle de RAWG para previsualizar antes de aplicar
- [x] Renombrar módulo `game-external-ids` → `game-external` (modelo `GameExternal`, índice único `(gameId, source)`)
- [x] `GET /game-external/rawg/:slug` — Fetch de data RAWG por slug para admin editor
- [x] `externalIds` en `PATCH /games/:id` y `POST /games` — crea/actualiza mapeo al guardar
- [x] Admin editor en game-detail: fetch RAWG por slug, editar todos los campos (título, descripción, plataformas, géneros, scores, times, DLC con parent game), guardar con externalIds
- [x] Admin editor en games-browse: crear juegos vacíos o desde RAWG, misma interfaz que editar
- [ ] Exponer `GameExternal` en el serializer de Game para links externos (RAWG, Steam, Metacritic)
- [ ] Poblar `GameExternal` para los juegos originales (bulk update con RAWG IDs)
- [ ] Links externos en ficha del juego: RAWG (via slug fallback), Steam y Metacritic (via external IDs)

### Perfil público básico

- [ ] `GET /users/:username` — Página pública con estadísticas básicas:
    - Total de juegos completados
    - Total abandonados
    - Juegos en progreso
    - Ratio promedio
    - Total de backlogs (incluye replays)
- [ ] Widget "Jugando ahora" en el perfil: muestra los juegos con status `playing`
- [ ] Listas públicas del usuario visibles en su perfil

### Ver juegos de otro usuario

- [ ] `GET /users/:username/games` — Ver la lista completa de un usuario (juegos públicos)
- [ ] `GET /users/:username/games?status=playing` — Ver qué está jugando un amigo
- [ ] `GET /users/:username/games?status=completed&from=...&to=...` — Ver qué jugó en un semestre específico

### Listas públicas (vista básica)

- [ ] `GET /lists/:id/public` — Ver una lista pública por URL
- [ ] Hacer que las listas con `is_public: true` sean visibles en el perfil del usuario
- [ ] Al ver la lista de otro usuario, mostrar tu propio estado para cada juego (si aplica)

### Migraciones de base de datos

- [ ] Reemplazar `sequelize.sync()` por migraciones (`sequelize-cli` o `umzug`) antes de que haya usuarios reales
- [ ] Crear migraciones iniciales para todos los modelos existentes

### Auth — Refresh tokens

- [ ] Endpoint de renovación de token (`POST /auth/refresh`)
- [ ] Endpoint de logout / invalidación de refresh token
- [ ] Almacenar refresh tokens en DB
- [ ] Access token corto (15-30 min) + refresh token largo (30 días)

### Reportes de juegos erróneos

- [ ] Tabla `GameReport`: id, gameId, userId, message (TEXT), status (`pending` | `approved` | `rejected`), createdAt, updatedAt
- [ ] `POST /games/:id/reports` — Crear reporte (usuario autenticado, un reporte activo por usuario/juego)
- [ ] `GET /admin/game-reports` — Listar reportes pendientes (solo admin)
- [ ] `PATCH /admin/game-reports/:id` — Cambiar status a approved/rejected (solo admin)
- [ ] Vista en frontend: botón "Report issue" en game-detail, modal con textarea
- [ ] Vista admin: lista de reportes pendientes con link al juego
- [ ] Futuro: contador de reportes aprobados por usuario para insignias

### Onboarding para amigos

- [ ] Flujo de registro limpio y funcional
- [ ] Corrección de bugs encontrados en Fase 1

### Panel admin de usuarios

- [ ] `POST /admin/users` — Crear usuario manualmente (solo admin)
- [ ] Bloquear `POST /auth/register` para usuarios no autenticados (registro solo via admin hasta beta pública)
- [ ] Vista en frontend para crear usuarios desde el panel admin

---

## 🟦 FASE 3 — Beta Cerrada _(~2–3 meses)_

**Objetivo:** Validar que la app genera interés real fuera de tu círculo cercano. Sistema de invitación.
**Condición de éxito:** Usuarios que no conoces usan la app regularmente y completan juegos.

> 🔒 _Beta por invitación — 50 a 200 usuarios._

### Infraestructura

- [ ] Contratar VPS dedicado para Completr (KVM 1, separado del VPS personal)

### Sistema social

- [ ] `POST /users/:username/follow` — Seguir a un usuario
- [ ] `DELETE /users/:username/follow` — Dejar de seguir
- [ ] `GET /users/:username/followers` — Ver seguidores
- [ ] `GET /users/:username/following` — Ver a quién sigo
- [ ] Feed de actividad pública: "X completó Y", "X añadió Y a su backlog"
- [ ] `GET /feed` — Endpoint de actividad de usuarios seguidos

### Listas oficiales de Completr

- [ ] Identificar listas oficiales por el rol del creador (admin) — no requiere campo extra en el modelo
- [ ] Serializer de lista: incluir flag `isOfficial` derivado del rol del owner
- [ ] Frontend: badge/insignia visual en cards de listas oficiales (logo Completr o icono verificado)
- [ ] Frontend: destacar listas oficiales en games-browse (sección "Completr Lists")
- [ ] Frontend: en list-detail, mostrar badge "Official" junto al nombre si es oficial

### Listas públicas — funcionalidades sociales

- [ ] `GET /lists/:id/followers` — Ver seguidores de una lista (cantidad y usuarios)
- [ ] `GET /lists/following` — Ver las listas públicas que sigo
- [ ] `PATCH /lists/:id/follow` — Cambiar visibilidad del seguimiento (`is_visible: true/false`)
- [ ] Listas públicas del usuario visibles en su perfil
- [ ] Al ver una lista seguida, mostrar el progreso personal del usuario:
    - Cuántos juegos de la lista ha completado: "18/30 completados"
    - Cuáles faltan por completar
    - Para cada juego: su `Backlog` (completado, no iniciado, etc.) y `play_count`

### Social — Ver actividad de amigos

- [ ] `GET /lists/:id/progress/:username` — Ver el progreso de un amigo en una lista específica (ej: ver qué juegos de "Resident Evil" ha completado mi amigo, incluyendo cuántas veces completó cada uno)
- [ ] `GET /users/:username/games?game_id=:id` — Ver si un amigo ha jugado un juego específico (para sugerirle "completémoslo juntos")

### Privacidad

- [ ] Respetar `User.isPublic` en todos los endpoints de perfil/juegos de otro usuario
- [ ] `ListFollower.isVisible` para controlar si el seguimiento aparece en el perfil público
- [ ] Regla: `visible = User.isPublic AND ListFollower.isVisible`

### Búsqueda avanzada

- [ ] Filtros combinados: género, plataforma, estado, ratio mínimo/máximo, duración
- [ ] Ordenamiento dinámico: rating, duración, ratio, popularidad (nº de usuarios que lo tienen)
- [ ] Búsqueda por texto con debounce en el frontend

### Landing page

- [ ] Crear landing page con Astro: descripción de Completr, screenshots y formulario de "solicitar invitación"
- [ ] Sección `/changelog` con novedades de cada release (Astro + Content Collections, posts en markdown)

### Sistema de invitación

- [ ] Registro solo por código de invitación
- [ ] Cada usuario puede generar N invitaciones
- [ ] Tracking de quién invitó a quién (útil para badges futuros)

### Badges (manuales)

- [ ] Modelo `Badge`: id, code, name, description, icon_url, type (`manual` | `automatic`), created_at
- [ ] Modelo `UserBadge`: id, user_id, badge_id, awarded_at — tabla pivote usuario ↔ badge
- [ ] `GET /users/:username/badges` — Ver badges de un usuario (visible en perfil público)
- [ ] `POST /badges/:code/award/:username` — Asignar badge a usuario (solo admin)
- [ ] `DELETE /badges/:code/revoke/:username` — Revocar badge (solo admin)
- [ ] Badges iniciales: `founder` (primeros N registros), `beta-tester` (usuarios de beta cerrada), `moderator` (rol moderador), `premium-supporter` (suscripción activa)
- [ ] Mostrar badges en el perfil público del usuario
- [ ] Los badges automáticos (logros por completar juegos) se implementan en Fase 4

### "¿Dónde iba?" (notas de progreso)

- [ ] Notas rápidas de progreso dentro de un juego: "Capítulo 3, stuck en el puzzle del agua"
- [ ] Al retomar un juego después de meses, el usuario sabe exactamente dónde quedó

### Jugando con (co-op)

- [ ] Etiquetar amigos en un backlog de juego co-op/multiplayer
- [ ] Mostrar en la ficha del juego con quién lo jugaste

### Backlog randomizer

- [ ] Endpoint "¿Qué juego?" que elige un juego aleatorio del backlog del usuario
- [ ] Filtros opcionales: género, plataforma, duración máxima, mood tags

### Mood tags

- [ ] Tags definidos por el usuario para sus juegos: "relajante", "sesiones cortas", "podcast game", "intenso", etc.
- [ ] Usables como filtro en el backlog y en el randomizer

### "Recomiéndame"

- [ ] Tus amigos votan cuál de tus juegos pendientes deberías jugar
- [ ] Mostrar resultados de votación al usuario

---

## 🟩 FASE 4 — Beta Pública _(~2–3 meses)_

**Objetivo:** Abrir el registro a todos. Validar retención, onboarding y UX a escala.
**Condición de éxito:** Usuarios nuevos entienden la app sin ayuda, completan juegos, y vuelven la semana siguiente.

> 🚀 _Completr – Public Beta (500+ usuarios). Sin premium. El objetivo es mejorar, corregir y estabilizar._

### Reviews

- [ ] `POST /game-shelf/:id/review` — Crear review de texto de un juego
- [ ] `PATCH /game-shelf/:id/review` — Editar review
- [ ] `DELETE /game-shelf/:id/review` — Eliminar review
- [ ] `GET /games/:id/reviews` — Ver reviews públicas de un juego

### Estadísticas de listas públicas

- [ ] Estadísticas agregadas de la lista:
    - Número de seguidores
    - Número de seguidores que la han completado al 100%
    - Juego más completado de la lista
    - Juego menos completado de la lista
- [ ] Listas públicas que el usuario sigue, con su progreso, visibles en su perfil

### Social avanzado

- [ ] Comparación de listas entre dos usuarios: juegos en común completados, juegos que uno tiene y otro no
- [ ] Perfil público ampliado: progreso del backlog (% completado), listas seguidas
- [ ] Filtrar feed de actividad por tipo: "solo completados", "solo abandonados", etc. (premium)
- [ ] Duplicar listas: copiar una lista pública a tus propias listas (free)

### Logros y milestones (free)

- [ ] Sistema de logros automáticos: "Completaste 50 juegos!", "5 juegos en un mes!", "Primera saga completada!"
- [ ] Logros visibles en el perfil público
- [ ] Notificación al desbloquear un logro

### Resumen semestral básico (free)

- [ ] Resumen automático al cierre de semestre: "En 2025-S01 completaste 18 juegos, tu género favorito fue Survival Horror, tu juego más rápido fue Florence (30 min)"
- [ ] Visible en el perfil y compartible

### Notificación de progreso semestral (free)

- [ ] "Llevas 12/25 del semestre, vas al 48% con 2 meses restantes"
- [ ] Recordatorios opcionales de progreso

### Discord bot

- [ ] Bot que muestra "jugando ahora", stats del perfil y logros en un server de Discord

### Dificultad comunitaria

- [ ] Al completar un juego, el usuario puede votar la dificultad (fácil, normal, difícil, brutal)
- [ ] Mostrar dificultad promedio en la ficha del juego (útil para decidir qué jugar según el ánimo)

### Recomendaciones por coincidencia

- [ ] "Usuarios que completaron X también completaron Y" — recomendación básica por coincidencias estadísticas, sin IA

### Social cards

- [ ] Generar imagen compartible al completar un juego ("Completé RE4 en 12h — 9/10") para WhatsApp, Twitter, etc.

### Franchise tracker

- [ ] Progreso automático por sagas: "Resident Evil: 6/12 completados"
- [ ] Derivable de listas existentes que representen sagas

---

## 🟥 FASE 5 — Estabilización y Calidad _(~1–1.5 meses)_

**Objetivo:** Mejorar experiencia basada en feedback real de la beta pública. No agregar premium todavía.

### UX y performance

- [ ] Rediseño de UI/UX basado en feedback de usuarios de la Beta
- [ ] Implementar paginación por keyset (cursor-based) en todos los endpoints de listado
- [ ] Mejoras en el buscador (relevancia, typo-tolerance)
- [ ] Skeleton loaders y estados vacíos en el frontend

### Funcionalidades de gestión

- [ ] Sistema de tags personalizados por juego/lista
- [ ] Sistema de "motivo de abandono" al marcar un backlog como `abandoned` (se usa el campo `notes` del backlog)
- [ ] Exportar listas: `GET /lists/:id/export?format=csv` y `?format=json`
- [ ] Historial de actividad del usuario por período (semestre/año)

### Emails transaccionales

- [ ] Email de bienvenida al registrarse
- [ ] Email de recuperación de contraseña (`POST /auth/forgot-password`, `POST /auth/reset-password`)
- [ ] Integrar proveedor SMTP (Resend, SendGrid o similar)

### Integración automática con HowLongToBeat y Metacritic/OpenCritic

- [ ] Implementar cola de tareas con `node-cron` (o BullMQ+Redis si se escala) para scraping nocturno
- [ ] Job nocturno: buscar juegos sin scores de HLTB/Metacritic, obtener datos y crear GameScore/GameTime
- [ ] Manejo de errores del scraper: reintentos, logging de fallos
- [ ] Evaluar OpenCritic como alternativa/complemento a Metacritic según disponibilidad de API

### Hardening

- [ ] Auditoría de seguridad básica (headers, sanitización de inputs, rate limits por endpoint)
- [ ] Agregar transacciones en operaciones multi-modelo restantes (`replaceItems`, CSV import, etc.)
- [ ] Optimizar queries N+1 en Sequelize (eager loading)
- [ ] Tests de integración para los flujos principales (auth, listas, game-shelf, backlogs)
- [ ] Tests unitarios para services y serializers
- [ ] Configurar test runner con `node:test` nativo + global setup (seed DB de test, levantar server)
- [ ] DB de test ya configurada en docker-compose (`postgres-test` en puerto 5433, DB `completr_test`)
- [ ] Estructura de tests: `test/` a la misma altura que `src/`, misma estructura modular (ej: `test/auth/auth.service.test.ts`)

### Sostenibilidad (pre-Premium)

- [ ] Activar donaciones voluntarias (Ko-fi o GitHub Sponsors) para cubrir costos de infraestructura
- [ ] Badge "Early Supporter" exclusivo para quienes aporten (nunca más se podrá obtener)
- [ ] Los Early Supporters reciben premium gratuito mientras se desarrollan las primeras features premium: listas ilimitadas, filtros guardados ilimitados, CSV import y perfil premium (URL, portada y avatar custom)
- [ ] Una vez completadas esas 4, los Early Supporters votan el orden de las features premium restantes y pueden proponer nuevas ideas
- [ ] Premium gratuito para Early Supporters hasta que se complete el primer tercio de las features votadas; a partir de ahí, comienza el premium público (pago)
- [ ] El segundo tercio votado se lanza como siguientes features premium
- [ ] El último tercio se desarrolla sin fecha fija, en paralelo con Fase 7, a medida que haya tiempo

---

## ⭐ FASE 6 — Premium _(~2–3 meses desarrollo + 1 mes lanzamiento)_

**Objetivo:** Construir y lanzar Premium de forma suave y no agresiva. Sin paywalls incómodos.

> 🔥 Filosofía: _"Si te gusta Completr, esta versión es para apoyar el proyecto."_ (estilo Trakt)

### Estadísticas avanzadas (premium)

- [ ] Gráficos por género (distribución de juegos completados por género)
- [ ] Gráficos por plataforma
- [ ] Evolución del backlog por semestre/año
- [ ] Velocidad de completado (promedio de días entre `started_at` y `finished_at` en `Backlog`)
- [ ] Patrones de abandono (géneros o plataformas con mayor tasa de abandono)
- [ ] Panel "Insights del Jugador"
- [ ] Resumen semestral/anual detallado con gráficos (versión premium del Wrapped)
- [ ] Historial de estadísticas: cómo cambiaron tus hábitos entre años

### Personalización (premium)

- [ ] Temas visuales exclusivos: retro, sepia, hacker, minimal (free incluye light y dark)
- [ ] Avatares personalizados (upload de imagen)
- [ ] Portada personalizada del perfil (banner/cover image)
- [ ] Badges de "Early Supporter" para los primeros usuarios registrados
- [ ] Personalizar URL del perfil público

### Ratio personalizable (premium)

- [ ] Cambiar la fórmula del ratio (ej: dar más peso a la nota, ponderar por género)
- [ ] Algoritmos de ordenamiento personalizados

### Listas y colaboración (premium)

- [ ] Límite de listas en plan gratuito: máximo 5 listas (la lista Backlog no cuenta)
- [ ] Listas ilimitadas como feature Premium
- [ ] Modo colaborativo: solo el dueño premium puede invitar a otros usuarios a una lista compartida, con roles (editor/viewer). Si baja de premium, se congela la edición colaborativa

### Sincronización con Steam (premium)

- [ ] Guardar `steam_id` en modelo `User` (`PATCH /users/me/steam-id`)
- [ ] `POST /users/sync/steam` — Disparar sincronización manual con Steam
    - [ ] Consumir API pública de Steam: `GetOwnedGames`
    - [ ] Crear o actualizar entradas en `GameShelf` con los juegos de Steam
- [ ] Worker Service en `src/integrations/steam/`:
    - [ ] Sincronización automática periódica (cron)
    - [ ] Comparar `playtime_forever` de Steam con `hltb_duration` para calcular `personal_ratio` ajustado

### Importación CSV (premium)

- [ ] `POST /import/csv` — Endpoint para subir CSV con columnas: `title`, `platform`, `metacritic_score`, `hltb_duration`, `real_duration`, `status`, `finished_at`, `notes`
- [ ] Servicio de parseo y validación del CSV
- [ ] Match con juegos existentes (por título/slug) o creación vía RAWG si no existe
- [ ] Crear GameShelf + Backlog por cada fila importada
- [ ] Reporte de filas con errores al importar

### AI insights (premium)

- [ ] Análisis de patrones de juego: "Abandonás más los RPGs largos", "Tu género más completado es Survival Horror"
- [ ] Recomendaciones personalizadas basadas en historial: "Basado en lo que jugaste, probá estos 10"
- [ ] Sugerencias semestrales: "Para el próximo semestre te recomiendo estos 20 juegos de tu backlog"

### Notificaciones sociales (free)

- [ ] Notificaciones: "Tu amigo X completó un juego de tu lista", "Nuevo juego añadido a la lista que sigues"

### Conveniencia (premium)

- [ ] Exportar a JSON (además de CSV que es free)
- [ ] Game screenshots/momentos: adjuntar capturas a entradas del backlog como recuerdos

### Feature flags

- [ ] Implementar sistema de feature flags por usuario (para activar/desactivar Premium internamente sin deployar)

### Infraestructura de pagos

- [ ] Integrar Stripe (u otro proveedor: LemonSqueezy, Paddle)
- [ ] Modelo de suscripción: Early Supporters $3 USD/mes (de por vida mientras mantengan suscripción activa, si cancelan y vuelven pagan precio público), público $5 USD/mes. Plan anual con descuento
- [ ] Webhooks para activar/desactivar plan Premium en tiempo real
- [ ] Endpoint `GET /users/me/subscription` — Estado actual de suscripción
- [ ] Manejo de expiración, cancelación y reactivación

### Lanzamiento

- [ ] Página "Completr Premium" con comparativa FREE vs PREMIUM
- [ ] Lanzamiento progresivo: features premium salen una por una, validando con feedback real
- [ ] 1er bloque (Early Supporters gratis): listas ilimitadas, filtros guardados ilimitados, CSV import, perfil premium (URL, portada y avatar custom)
- [ ] Votación + propuestas de ideas de Early Supporters para definir el orden de las features restantes
- [ ] Premium gratuito para Early Supporters hasta completar el 1er tercio de features votadas; luego comienza el premium público
- [ ] 2do tercio votado se lanza como siguientes features premium
- [ ] 3er tercio se desarrolla sin fecha fija, en paralelo con Fase 7
- [ ] Página de Patrons: mostrar nombres de Early Supporters y Premium en una página pública
- [ ] Banner no intrusivo en la app para usuarios Free
- [ ] Activar feature flags Premium para suscriptores

---

## 🟩 FASE 7 — Escalamiento Continuo _(12+ meses)_

**Objetivo:** Mejorar retención, engagement y expandir la plataforma.

### Features futuras (por priorizar según feedback)

- [ ] Recomendaciones: "¿Qué jugar ahora?" basado en ratio, duración disponible y género favorito (sin IA al inicio, algoritmo simple; con IA en versión premium futura)
- [ ] Análisis automático del período/semestre: resumen generado con IA (premium)
- [ ] Integración con Xbox/PSN (si APIs lo permiten)
- [ ] Mapa de calor estilo GitHub de sesiones de juego (usando `started_at`/`finished_at` de `Backlog`)
- [ ] App nativa (React Native o Flutter) solo si el volumen y las necesidades (push notifications nativas, integraciones con hardware) lo justifican. Mientras tanto, la PWA cubre el caso de uso móvil
- [ ] Tareas inteligentes del backlog: "Juega 2 horas esta semana a X"
- [ ] Migrar cola de tareas de `node-cron` a BullMQ + Redis si el volumen lo justifica
- [ ] CDN para imágenes de portadas
- [ ] Internacionalización (i18n)
- [ ] Calendario de lanzamientos: ver próximos releases con recordatorios y opción de agregar al backlog al salir
- [ ] Game Platinum: tabla `GamePlatinum` (id, user_id, game_id, platform_id, platinumed_at, notes). Independiente de GameShelf — el platino persiste aunque ya no tengas el juego. Unique en (user_id, game_id)
- [ ] Presupuesto de tiempo: "Este mes tengo 40h para jugar. RE4 cuesta 15h, Celeste 8h." Visual que se gasta a medida que juegas
- [ ] Play Along: playthroughs sincronizados con amigos, comparan progreso, discuten sin spoilers (la app sabe hasta dónde llegó cada uno)
- [ ] AI Sommelier contextual: recomendación con contexto emocional ("Acabas de terminar un RPG de 60h, necesitas un palate cleanser — aquí hay 3 juegos cortos de tu backlog") (premium)
- [ ] Detector de co-op: auto-detectar juegos que tú y un amigo tienen en el backlog y ninguno ha jugado, sugerir jugarlos juntos

---

## 💎 Comparativa FREE vs PREMIUM

> Filosofía: Free es una experiencia completa para gestionar tu backlog. Premium agrega insights, personalización y conveniencia.

| Feature                               | Free                                       | Premium                            |
| ------------------------------------- | ------------------------------------------ | ---------------------------------- |
| **Tracking de juegos y backlogs**     | ✅ Completo                                | ✅ Completo                        |
| **Vistas/filtros (status, semestre)** | ✅                                         | ✅                                 |
| **Listas**                            | ✅ Hasta 5                                 | ✅ Ilimitadas                      |
| **Filtros del backlog**               | ✅ Ilimitados                              | ✅ Ilimitados                      |
| **Filtros guardados**                 | ✅ Hasta 5                                 | ✅ Ilimitados                      |
| **Wishlist**                          | ✅ Hasta 10                                | ✅ Ilimitada                       |
| **Favorites**                         | ✅ Hasta 10                                | ✅ Ilimitados                      |
| **Ratio y personal ratio**            | ✅                                         | ✅ + Fórmula personalizable        |
| **Fuentes de score (manual)**         | ✅ Todas las fuentes                       | ✅ Todas las fuentes               |
| **Actualización masiva de scores**    | ✅ OpenCritic + Completr / HLTB + Completr | ✅ + Metacritic, RAWG              |
| **HLTB auto-fetch**                   | ✅                                         | ✅                                 |
| **Perfil público**                    | ✅                                         | ✅ + URL, portada y avatar custom  |
| **Follow usuarios**                   | ✅                                         | ✅                                 |
| **Seguir listas públicas + progreso** | ✅                                         | ✅                                 |
| **Comparación con amigos**            | ✅                                         | ✅                                 |
| **Reviews**                           | ✅                                         | ✅                                 |
| **Búsqueda y ordenamiento**           | ✅                                         | ✅                                 |
| **Logros/milestones**                 | ✅                                         | ✅                                 |
| **Resumen semestral**                 | ✅ Básico (texto)                          | ✅ Detallado (gráficos)            |
| **Notificación de progreso**          | ✅                                         | ✅                                 |
| **Exportar**                          | ✅ CSV                                     | ✅ CSV + JSON                      |
| **Backlog randomizer**                | ✅                                         | ✅                                 |
| **Cola "Siguiente"**                  | ✅                                         | ✅                                 |
| **Mood tags**                         | ✅                                         | ✅                                 |
| **"Recomiéndame"**                    | ✅                                         | ✅                                 |
| **Jugando con (co-op)**               | ✅                                         | ✅                                 |
| **Dificultad comunitaria**            | ✅                                         | ✅                                 |
| **Recomendaciones por coincidencia**  | ✅                                         | ✅                                 |
| **Social cards**                      | ✅                                         | ✅                                 |
| **Franchise tracker**                 | ✅                                         | ✅                                 |
| **Discord bot**                       | ✅                                         | ✅                                 |
| **Calendario de lanzamientos**        | ✅                                         | ✅                                 |
| **Duplicar listas**                   | ✅                                         | ✅                                 |
| **Temas visuales**                    | ✅ Light y dark                            | ✅ + Retro, sepia, hacker, minimal |
| **Filtrar feed por tipo**             | ❌                                         | ✅                                 |
| **Estadísticas avanzadas**            | ❌                                         | ✅ Gráficos, trends, patrones      |
| **CSV import**                        | ❌                                         | ✅                                 |
| **Notificaciones sociales**           | ✅                                         | ✅                                 |
| **Listas colaborativas**              | ❌                                         | ✅ Roles editor/viewer             |
| **Sync Steam**                        | ❌                                         | ✅ Auto-import + playtime          |
| **AI insights**                       | ❌                                         | ✅ Patrones, recomendaciones       |
| **Game screenshots/momentos**         | ❌                                         | ✅                                 |
| **Badge Early Supporter**             | ❌                                         | ✅ Exclusivo, irrepetible          |

---

## 🛠️ Notas arquitectónicas transversales

Estas decisiones aplican a **todo el proyecto**, no son una fase:

- **Separación `games` vs `game-shelf`:** `games` es el catálogo global (admin lo alimenta). `game-shelf` es la relación usuario↔juego con sus datos personales (`user_rating`, `real_duration`, `notes`). No mezclarlos.
- **Separación `game-shelf` vs `lists`:** `game-shelf` registra qué juegos tiene el usuario. `lists` y `list-items` gestionan las colecciones curadas. Un juego puede estar en `game-shelf` sin estar en ninguna lista, y en varias listas a la vez.
- **Listas con puntajes de fuente oficial:** Las listas usan una fuente global de score/duration (metacritic, rawg, hltb, etc.). No permiten valores custom. El ratio se calcula desde estos datos. Si la fuente no tiene dato para un juego → null.
- **Interacción con listas ajenas:** Al ver una lista autenticado, el backend incluye tu `backlogStatus` por juego. Para añadir un juego a tu backlog, vas a la ficha del juego. Puedes seguir la lista (bookmark social) para acceso rápido desde tu perfil.
- **Backlogs como tabla central:** Todo el historial del usuario vive en `Backlog` (not_started, playing, completed, abandoned). El estado actual de un juego se deriva del backlog más reciente. El play_count se calcula contando backlogs. No existe tabla de estado global separada.
- **Vistas ≠ Listas:** Las vistas (pendientes, jugando, completados, por semestre) son **filtros sobre `Backlog`**, no listas separadas. Las listas son colecciones curadas de juegos con puntajes oficiales (sagas, temáticas, tops). Esto replica el modelo mental de NocoDB donde las vistas son filtros sobre la misma tabla.
- **Semestre = filtro por fecha:** No existe un campo "semestre". El semestre se deriva de `Backlog.finished_at`: ene-jun = S01, jul-dic = S02. Las vistas semestrales son simplemente filtros por rango de fechas.
- **Listas públicas y follow:** Cualquier lista con `is_public: true` puede ser vista y seguida. El follow es un bookmark social (acceso rápido + visibilidad en perfil). Al ver la lista autenticado, el backend incluye el `backlogStatus` por juego. Las estadísticas de progreso se calculan en frontend.
- **Privacidad en dos niveles:** `User.isPublic` controla si el perfil es visible. `ListFollower.isVisible` controla si un seguimiento específico aparece en el perfil público. La regla es: `visible = User.isPublic AND ListFollower.isVisible`. Si el perfil es privado, nada es visible independientemente del `isVisible` de cada lista.
- **UUIDs en Foreign Keys:** Definir explícitamente el tipo UUID en todas las relaciones de `associations.database.ts` para evitar bugs con Sequelize.
- **Serializer Pattern:** Toda la lógica de cálculo (ratio, personal_ratio, estadísticas) vive en el backend dentro de los serializers/services. El frontend solo renderiza.
- **`metadata_pending`:** Cualquier juego creado manualmente nace con `metadata_pending: true`. El worker nocturno se encarga de enriquecerlo con datos de HLTB y Metacritic.
- **Wishlist y Favorites (no son listas):** En vez de "listas por defecto" dentro del módulo Lists, Wishlist y Favorites son módulos independientes. Wishlist apunta a `Backlog` (runs específicas, con posición y auto-remove al completar/abandonar). Favorites apunta a `Game` (no requiere backlog). Ambos tienen límite 10 free / ilimitado premium. Visibilidad controlada desde `User.isWishlistPublic` y `User.isFavoritePublic`.
- **`personal_ratio`:** Se calcula desde `Backlog.real_duration` del backlog completado. Si hay múltiples backlogs completados, se usa el primero o el mejor según preferencia.
- **Sistema de puntajes en 3 niveles:**
    - `GameScore` — Catálogo global de puntajes/tiempos por fuente (Metacritic, OpenCritic, HLTB, Completr community). Actualizado por cron mensual. La ficha del juego muestra todos los disponibles.
    - `GameShelf` — Puntaje/duración que el usuario eligió para su backlog. Se precarga al añadir un juego, editable manualmente. Determina el ratio en el backlog.
    - `ListItem` — Puntaje/duración congelados desde la fuente oficial de la lista. No editables manualmente. Actualizables con "actualizar puntajes" (refresh-scores). Las listas no permiten valores custom, solo fuentes oficiales.
- **Filtros guardados (`SavedFilter`):** Los usuarios pueden filtrar su backlog libremente (status, género, plataforma, semestre, etc.). Los filtros se pueden guardar con un nombre. Free: hasta 5 guardados. Premium: ilimitados. Los filtros guardados son presets de query params, no listas.
