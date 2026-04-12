# Completr — Contexto del Proyecto

## Visión

Completr es una aplicación web tipo **Trakt, pero para videojuegos**. Permite a los usuarios gestionar su backlog de juegos, priorizarlos mediante un sistema de ratio (puntuación / duración) y hacer seguimiento semestral de los que quieren completar.

Nace de la necesidad de reemplazar una hoja de cálculo de Google donde el creador registra juegos por semestre con su plataforma, duración estimada (HowLongToBeat), nota promedio (Metacritic) y un ratio calculado para priorizar qué jugar primero.

---

## Problema que resuelve

El usuario mantiene un Excel semestral con columnas: juego, plataforma, puntuación Metacritic, duración HLTB, ratio (puntuación/duración), estado (No Iniciado, Jugando, Completado, Abandonado, Mal Optimizado), duración real, ratio real y notas.

**Dolor principal:** todo es manual — buscar datos, calcular ratios, ordenar, hacer seguimiento.

**Completr automatiza:**

- Carga de datos de HLTB y Metacritic/OpenCritic
- Cálculo del ratio y ratio personal (con duración real)
- Ordenamiento inteligente (premia juegos cortos con buena nota)
- Seguimiento de progreso por semestre
- Compartir listas con amigos (aspecto social opcional)

---

## Conceptos clave del dominio

### Sistema de puntajes (3 niveles)

Los puntajes y tiempos viven en 3 lugares distintos según el contexto:

1. **`GameScore`** + **`GameTime`** — Catálogo global. `GameScore` almacena puntajes (Metacritic, OpenCritic, RAWG, Completr community). `GameTime` almacena duraciones (HLTB, RAWG, Completr community). Tablas separadas para evitar nulls. Cada una tiene UUID propio + unique index en (game_id, source). Actualizados por cron mensual. La ficha del juego muestra todos los disponibles. Los datos de RAWG se almacenan en crudo (ej: rating RAWG es escala 0-5, no se normaliza).
2. **`GameShelf`** — Datos del usuario. Al añadir un juego al backlog, se precarga el puntaje/duración de la fuente preferida. El usuario puede editarlo manualmente. Determina el ratio en el backlog.
3. **`ListItem`** — Datos congelados. Al añadir a una lista, se copia desde la fuente elegida. No editable manualmente — solo con "actualizar puntajes" o "elegir fuente". Las listas no permiten valores custom.

`Game` ya NO tiene `averageScore` ni `averagePlaytime` — los puntajes viven en `GameScore` y las duraciones en `GameTime`.

**Precarga de puntajes al crear backlog:** Al seleccionar un juego, el frontend precarga score (Metacritic preferido) y duration (HLTB preferido) desde los GameScore/GameTime del juego. El usuario puede editarlos antes de guardar.

**Regla free vs premium para scores:** Todos los usuarios pueden ver y usar scores de cualquier fuente al crear/editar manualmente. La diferencia es la **actualización masiva**: free solo puede actualizar en lote con OpenCritic + Completr (score) y HLTB + Completr (duration). Premium puede actualizar masivamente con todas las fuentes (Metacritic, RAWG, OpenCritic, HLTB, Completr).

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

El backlog soporta filtros completos por: status (uno o varios comma-separated, ej: `completed,abandoned`), game_id, platform_id, rangos de fechas (started_from/to, finished_from/to), no_finished_date (bool, filtra entradas sin fecha de finalización), rangos numéricos (min/max_score, min/max_duration, min/max_rating) y ordenamiento (sort_by + sort_order). Cualquier combinación de filtros se puede guardar como vista con nombre y descripción opcional (ej: "Completados 2025-S01"). El backend almacena los filtros como JSONB y el frontend los aplica como query params al consultar el backlog. Free: hasta 5 vistas guardadas, Premium: ilimitadas. Las vistas son una conveniencia — cualquier usuario puede construir la URL con query params y guardarla como bookmark.

### Wishlist y Favorites

Dos módulos independientes que reemplazan el concepto original de "listas por defecto". No son listas (`List`) — son marcas personales ligeras sobre juegos.

**Wishlist** — Cola priorizada de juegos que el usuario quiere jugar. Apunta a `Backlog` (no a `Game`) porque es sobre runs específicas. Un juego puede aparecer varias veces (ej: RE4 en difícil y en profesional).

- Modelo: `Wishlist(id, user_id, backlog_id, position, added_at)` — Unique `(user_id, backlog_id)`
- POST con `?source=game`: crea backlog `not_started` + wishlist entry en transacción
- POST con `?source=backlog`: añade backlog existente a la wishlist
- PUT: reemplaza array completo de `backlogIds` (posición por orden)
- Auto-remove: al cambiar backlog a `completed` o `abandoned`, se elimina de la wishlist
- Límite: 10 free, ilimitado premium/admin

**Favorites** — Juegos que el usuario marca como favoritos. Apunta a `Game` (no requiere backlog). Puedo marcar un juego como favorito sin haberlo jugado.

- Modelo: `Favorite(id, user_id, game_id, position, added_at)` — Unique `(user_id, game_id)`
- PUT: reemplaza array completo de `gameIds` (posición por orden)
- Límite: 10 free, ilimitado premium/admin

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
- Límite: free hasta 5 listas, premium/admin ilimitado. Si un usuario baja de premium a free con >5 listas, quedan congeladas (no puede crear ni editar) hasta que elimine las sobrantes

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

### Listas públicas y follow

Cualquier lista con `is_public: true` puede ser vista y seguida por otros usuarios (`ListFollower`). Cuando un usuario ve una lista pública:

- Ve todos los juegos con los puntajes congelados desde la fuente oficial de la lista
- Si está autenticado, ve su propio estado para cada juego (derivado de sus backlogs)
- El frontend calcula estadísticas: "has completado 8/15", progreso por juego
- Puede seguir la lista para acceso rápido desde su perfil

---

## Separación de módulos clave

### `games` vs `game-shelf` vs `lists` vs `backlogs`

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

## Stack técnico

| Capa             | Tecnología                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Backend**      |                                                                                                                                      |
| Runtime          | Node.js + TypeScript                                                                                                                 |
| Framework        | Express 5                                                                                                                            |
| ORM              | Sequelize 6                                                                                                                          |
| Base de datos    | PostgreSQL                                                                                                                           |
| Autenticación    | JWT (access token) + bcrypt                                                                                                          |
| Validación       | Zod v4 (no v3 — la API tiene diferencias)                                                                                            |
| Logging          | Pino                                                                                                                                 |
| Seguridad        | Helmet, CORS, rate-limiter-flexible                                                                                                  |
| **Frontend**     |                                                                                                                                      |
| Framework        | Angular                                                                                                                              |
| Estrategia móvil | PWA (Progressive Web App) — instalable, cacheo offline, sin costo de stores. App nativa solo si el volumen lo justifica en el futuro |

---

## Arquitectura del backend

### Estructura de módulos

```
src/
├── auth/              # Registro, login, cambio de contraseña, JWT
├── users/             # Perfil, gestión de cuenta
├── games/             # Catálogo global de juegos (CRUD admin/moderador)
├── platforms/         # Plataformas de juego (PS5, Steam, etc.)
├── genres/            # Géneros de juegos
├── game-platform/     # Tabla pivote juego ↔ plataforma
├── game-shelf/        # Librería personal del usuario
├── game-scores/       # Puntajes globales por fuente (Metacritic, OpenCritic, RAWG, Completr)
├── game-times/        # Duraciones globales por fuente (HLTB, RAWG, Completr)
├── game-genre/        # Tabla pivote juego ↔ género
├── saved-filters/     # Vistas guardadas del backlog (CRUD con límite free/premium)
├── lists/             # Listas curadas de juegos con puntajes de fuente oficial
├── list-items/        # Items de lista (juego ↔ lista) con score/duration congelados
├── list-followers/    # (pendiente) Suscripción a listas públicas
├── backlogs/          # Historial completo del usuario (not_started, playing, completed, abandoned)
├── wishlist/          # Cola priorizada de runs (apunta a backlog)
├── favorites/         # Juegos marcados como favoritos (apunta a game)
├── game-external-ids/ # Mapeo de juegos a IDs en plataformas externas (RAWG, IGDB, Steam, etc.)
├── rawg/              # Provider de RAWG API (géneros, descripción, scores, playtime, covers)
├── hltb/              # (pendiente) Provider de HowLongToBeat
├── metacritic/        # (pendiente) Provider de Metacritic/OpenCritic
├── steam/             # (pendiente) Provider de Steam API
├── database/          # Conexión, inicialización, asociaciones
└── common/            # Config, middlewares, errores, logger, utils, types
```

### Estructura interna de un módulo

Cada módulo sigue la misma convención de archivos. Si una categoría tiene un solo archivo, se queda en la raíz del módulo. Si tiene más de uno, se agrupa en su carpeta.

**Módulo completo (ejemplo: `games/`):**

```
src/games/
├── game.model.ts                  # Modelo Sequelize
├── games.service.ts               # Lógica de negocio + queries DB
├── games.controller.ts            # Handlers de request/response
├── games.routes.ts                # Definición de rutas Express
├── games.serializer.ts            # Transformación de respuesta al frontend
├── dtos/                          # Carpeta si hay >1 DTO
│   ├── register-game.dto.ts       # Tipo inferido desde Zod schema (z.infer<>)
│   └── update-game.dto.ts
├── schemas/                       # Carpeta si hay >1 schema
│   ├── register-game.schema.ts    # Validación Zod para body
│   ├── update-game.schema.ts
│   ├── game-code-params.schema.ts # Validación Zod para params
│   └── game-id-params.schema.ts
└── errors/                        # Carpeta si hay >1 archivo de error
    ├── games.service-error.ts     # Constructores de ServiceError del módulo
    └── games.domain-error.ts      # Constructores de DomainError del módulo
```

**Módulo simple (ejemplo: `genres/` con un solo DTO):**

```
src/genres/
├── genres.model.ts
├── genres.service.ts
├── genres.controller.ts
├── genres.routes.ts
├── register-genre.dto.ts          # Un solo DTO → queda en raíz, sin carpeta
├── schemas/
│   └── ...
└── errors/
    └── ...
```

**Regla general:** si hay 1 archivo de una categoría (dto, schema, error, serializer, mapper, util, helper), queda en la raíz del módulo. Si hay 2+, se mueve a su propia carpeta.

**Nota sobre DTOs:** Aunque actualmente son solo `z.infer<typeof Schema>`, se mantienen en archivos separados intencionalmente. El DTO podría evolucionar independientemente del schema (ej: agregar campos calculados, omitir campos internos). Mantenerlos separados es una decisión de diseño, no redundancia.

Opcionalmente un módulo puede tener:

- `mappers/` — Conversión entre capas de error (service-to-domain, domain-to-http)
- `utils/` — Utilidades específicas del módulo
- `helpers/` — Funciones auxiliares del módulo
- `services/` — Subfolder si hay múltiples services (ej: `auth/services/password.service.ts`, `auth/services/token.service.ts`)

### Proveedores de servicios externos (providers)

Los servicios externos se abstraen mediante **providers** directamente en `src/`. Cada provider es un módulo más al mismo nivel que `games/` o `users/` — actúa como un "bridge": encapsula la lógica de conexión y expone una interfaz limpia. Los módulos de negocio llaman al provider sin conocer cómo funciona internamente.

> **Nota:** Todavía se está evaluando si algunos providers genéricos o compartidos deberían vivir en `src/common/providers/` en vez de en `src/`. Por ahora, cada provider va en su propio directorio en `src/`.

**Estructura de un provider (ejemplo: `src/hltb/`):**

```
src/hltb/
├── hltb.provider.ts               # Clase/funciones que exponen la interfaz pública
├── hltb.interface.ts              # Tipos de request/response del provider
└── errors/
    └── hltb.service-error.ts      # ServiceError específicos (timeout, rate limit, not found, parse error)
```

**Responsabilidades del provider:**

- Hacer las llamadas HTTP/scraping al servicio externo
- Parsear la respuesta a los tipos definidos en la interface
- Lanzar `ServiceError` con `service: "HLTB Provider"` en caso de fallo (red, rate limit, respuesta inesperada, servicio caído)
- **NO** contiene lógica de negocio — solo transporte y transformación de datos

**Cómo se consume desde un módulo:**

```
games.service.ts → hltb.provider.ts → HowLongToBeat API
                                    ↗ ServiceError si falla
```

El módulo que consume el provider decide qué hacer con el error: reintentarlo, loggearlo, o dejarlo fluir al normalizer global.

**Providers:**

- `src/rawg/` — RAWG API (implementado). Clase `RawgProvider` con: `searchGame(query, filters)`, `getGameById(id)`, `getGameBySlug(slug)`. Soporta filtros: dates, platforms, genres, metacritic, ordering, search_exact, exclude_additions. API key en `api-keys.config.ts`.
- `src/hltb/` — (pendiente) HowLongToBeat (duración estimada)
- `src/metacritic/` — (pendiente) Metacritic u OpenCritic (puntuación promedio)
- `src/steam/` — (pendiente) Steam API (sincronización de librería)

### Configuración de entorno

Las variables de entorno se dividen en archivos separados en `src/common/config/`:

- `environment.config.ts` — Variables generales: NODE_ENV, PORT, tokens JWT, CORS, password salt
- `database.config.ts` — Variables de PostgreSQL: PG_DATABASE, PG_USER, PG_PASSWORD, PG_HOST, PG_PORT
- `api-keys.config.ts` — API keys de servicios externos: RAWG_API_KEY

Las variables se cargan desde `.env` usando Node 22+ `--env-file=.env`. No se usa `dotenv`.

### Versionado por fase (semver)

| Fase     | Release  | Descripción                                 |
| -------- | -------- | ------------------------------------------- |
| Fase 0   | `v0.1.0` | Setup, arquitectura, sin usuarios           |
| Fase 1   | `v0.2.0` | Excel Killer, solo uso personal             |
| Fase 1.5 | `v0.2.x` | Beyond the Spreadsheet, mejoras + deploy    |
| Fase 2   | `v0.3.0` | MVP Amigos, 5–20 personas                   |
| Fase 3   | `v0.4.0` | Beta cerrada, 50–200 por invitación         |
| Fase 4   | `v1.0.0` | Beta pública, primer release abierto (500+) |
| Fase 5   | `v1.1.0` | Estabilización y calidad                    |
| Fase 6   | `v2.0.0` | Premium, cambio de modelo (monetización)    |
| Fase 7   | `v2.x.x` | Incrementales según features                |

### Estrategia de branching

- **Fases 0–2:** Todo el desarrollo va directo a `main` (solo developer, sin colaboradores)
- **Desde Fase 3 en adelante:** Cada fase se desarrolla en `develop` y se mergea a `main` al completarla

### Convenciones de commits

- Conventional Commits (ej: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- Solo una línea, sin cuerpo ni firma
- Ejemplo: `feat(genres): add error handling with ServiceError and DomainError`

### Post-edición de código

- Después de terminar ediciones de código, ejecutar `npm run lint:fix` y `npm run format`
- Después de crear o modificar endpoints, actualizar los archivos correspondientes en `docs/api/`

### Documentación de API (Bruno v3.1)

- Al crear un endpoint, generar su archivo `.yml` en `docs/api/<módulo>/`
- Formato: Bruno v3.1 con secciones `info`, `http`, `settings`, `docs`
- Endpoints autenticados incluyen `auth: type: bearer, token: "{{token}}"`
- URLs usan variable `{{BASE_URL}}`
- La sección `docs` incluye: descripción, auth requerida, rate limit, tabla de request body/params, y ejemplo de response JSON

### Patrón de capas por módulo

```
Route → Controller → Service → Model
                  ↘ Serializer (respuesta al frontend)
```

### Patrón de errores (3 capas)

```
ServiceError → DomainError → HttpError
```

**Dos tipos de error con propósitos distintos:**

- **ServiceError** — Errores técnicos de la capa de aplicación o infraestructura (fallo de DB, constraint violations, timeout de red, error de provider externo). Se lanzan desde **services** y **providers**.
- **DomainError** — Errores de reglas de negocio (recurso no encontrado, acción no permitida, validación de negocio). Se lanzan desde **controllers**.

**Regla:** los services **nunca** lanzan DomainError directamente. Si un service detecta un error de negocio (ej: recurso no encontrado), lanza un `ServiceError` que el normalizer global convierte a `DomainError`, o retorna `null` para que el controller lance el `DomainError`.

Cada módulo tiene sus propios mappers para convertir entre capas. Los providers también lanzan `ServiceError` con su propio nombre de servicio.

### Patrones clave

- **Serializer Pattern:** Toda lógica de cálculo (ratio, estadísticas) vive en backend. El frontend solo renderiza.
- **UUIDs:** Todas las PKs y FKs son UUID.
- **Soft Delete:** Games y Users usan flag `isActive` en vez de borrado físico.
- **Slugs/Codes:** Auto-generados desde títulos con slugify para URLs amigables.
- **Rate Limiting:** Diferenciado por tipo de endpoint (auth, registro, público, usuario).
- **Correlation IDs:** Cada request tiene un ID para trazabilidad en logs.
- **Providers como bridge:** Los servicios externos se abstraen como módulos en `src/` (ej: `src/hltb/`). Exponen interfaz limpia, lanzan `ServiceError` propios, y no contienen lógica de negocio.
- **Models nunca se importan entre módulos:** Para acceder a datos de otro módulo, se importa su **service** (ej: `games.service.ts` importa `platformsService.findPlatformsByCode()`, nunca `Platform` directamente). Esto mantiene la encapsulación — cada módulo es dueño de su modelo. **Excepción:** módulos de tablas pivote (ej: `game-platform/`, `game-shelf/`) pueden importar el **Model** directamente de otros módulos cuando necesitan referenciarlo en asociaciones o includes de Sequelize (ej: `include: [{ model: Game }, { model: Platform }]`), pero para operaciones de lectura/escritura siguen usando los services respectivos.
- **`request.locals` (Express 5):** En Express 5 `req.query` es inmutable, por lo que no se puede usar `Object.assign(request.query, data)`. La solución es usar `request.locals` como contenedor de datos validados. Se extiende `Express.Request` mediante declaration merging en `src/common/types/express.d.ts`. Los middlewares escriben en `request.locals` (`body`, `params`, `query`, `user`, `correlationId`) y los controllers leen desde ahí con type assertion (`request.locals.body as Dto`, `request.locals.user as RequestUser`). El `tsconfig.json` usa `"files"` para que ts-node cargue el `.d.ts` correctamente.

---

## Roles de usuario

| Rol         | Permisos                                           |
| ----------- | -------------------------------------------------- |
| `user`      | Gestión de su propio perfil, game-shelf y listas   |
| `premium`   | Todo lo de user + features premium (futuro)        |
| `moderator` | Todo lo de user + CRUD de games, platforms, genres |
| `admin`     | Acceso total                                       |

---

## Estado actual de implementación

### Completado (Fase 0)

- Auth: registro, login, cambio de contraseña
- Users: perfil, actualización, desactivación
- Games: CRUD completo con vinculación a plataformas y géneros. Campos: isDlc, parentGameId (self-reference para DLCs). description es TEXT en DB.
- Platforms: CRUD completo (35 plataformas cargadas)
- Genres: CRUD completo (38 géneros cargados)
- GameShelf: CRUD completo con campos de score/duration/scoreSource/durationSource
- GameScore: endpoints de creación y consulta (sources: metacritic, opencritic, rawg, completr)
- GameTime: endpoints de creación y consulta (sources: hltb, rawg, completr)
- GameGenre: service para vincular juegos con géneros
- Todos los modelos de DB creados: Game, Platform, Genre, GamePlatform, GameGenre, GameShelf, GameScore, GameTime, List, ListItem, ListFollower, Backlog, SavedFilter
- Error handling completo en todos los módulos (registrados en normalizers globales)
- Validación UUID (`z.uuid()` de Zod v4) en todos los schemas de params
- RAWG provider implementado (`RawgProvider` class con searchGame, getGameById, getGameBySlug)
- Config separada: environment.config.ts, database.config.ts, api-keys.config.ts
- Infraestructura: error handling, logging, rate limiting, validación, CORS, Helmet
- Data maestra: 517 juegos enriquecidos con RAWG (descripciones, covers, fechas, géneros, scores RAWG, playtimes RAWG) + scores Metacritic y tiempos HLTB del CSV original

### Completado (Fase 1 — Excel Killer v0.2.0)

- Backlog: CRUD completo con filtros avanzados (multi-status comma-separated, no_finished_date, platform_id, rangos de fechas/score/duration/realDuration/rating, ordenamiento), isPublic, userRating (1-10 en pasos de 0.5), endpoints públicos para ver backlog de otros usuarios
- Saved Filters: CRUD con límite free (5) / premium (ilimitado), almacenamiento JSONB de presets de filtros, campo description, serializer sin timestamps
- Lists: CRUD completo con scoreSource/durationSource global, límite de 5 para free con frozen state, description. `GET /lists/:id` incluye followerCount, isFollowing y backlogStatus por juego (auth opcional)
- ListItems: `PUT /lists/:id/items` reemplaza el array completo de gameIds, congela scores desde fuente oficial, valida existencia de games y duplicados. `POST /lists/:id/refresh-scores` actualiza puntajes desde la fuente. Ratio calculado en serializer
- ListFollowers: `POST/DELETE /lists/:id/follow` — follow como bookmark social. Validación de lista pública, duplicado y not-following. Error handling completo
- Búsqueda con fallback a RAWG: `GET /games/search?query=` busca localmente, si 0 resultados busca en RAWG (hasta 3 resultados, `exclude_additions: true`), crea los juegos en DB con scores/times/genres/plataformas y los retorna. Dedup por GameExternalId y slug. Error handling individual por resultado
- Transacciones: `registerGame` envuelto en transacción atómica (juego + plataformas + scores + times + géneros). Validación de plataformas y géneros existentes antes de vincular
- Pruebas manuales completas: todos los endpoints probados con los 4 roles (admin, moderator, premium, user) + sin auth. Verificados permisos, validaciones, duplicados, not found, serializers
- Wishlist: `POST /users/me/wishlist?source=game|backlog` (crea backlog + wishlist o añade backlog existente), `PUT` replace-all con backlogIds, `GET` me y público. Auto-remove al completar/abandonar backlog. Límite 10 free / ilimitado premium
- Favorites: `PUT /users/me/favorites` replace-all con gameIds, `GET` me y público. No requiere backlog. Límite 10 free / ilimitado premium
- Campos `isWishlistPublic` y `isFavoritePublic` en modelo User
- GameExternalId: modelo para mapear juegos a IDs de plataformas externas (RAWG, IGDB, Steam, HLTB, Metacritic, OpenCritic). Sin endpoints — uso interno. Búsqueda con fallback a RAWG ahora verifica por external ID antes de crear duplicados
- `personalRatio` (score / realDuration) agregado al serializer de backlog
- CORS fix: origin `"*"` ya no se convierte a array (corregido en cors.config.ts)
- ScoreSource: tabla de referencia para fuentes de puntaje con escalas (metacritic:100, opencritic:100, rawg:5, completr:10). `GET /score-sources` público, `POST /score-sources` admin. GameScore.source ahora es FK a ScoreSource.code
- GameScore.source refactorizado de ENUM a STRING con FK a ScoreSource
- `backgroundUrl` agregado al modelo Game — RAWG `background_image` se guarda en `backgroundUrl`. `coverUrl` reservado para covers reales de otra fuente
- Búsqueda RAWG: fallback por slug cuando la búsqueda por texto no encuentra, `force_rawg=true` para saltar búsqueda local
- RAWG mapper: almacena rating RAWG como GameScore(source: 'rawg'), expande `pc` a múltiples tiendas (steam, gog, epic, etc.), mapea géneros con `rawg-genre.map.ts`
- Hard delete de games: `DELETE /games/:id?hard=true` (solo admin) con CASCADE en todas las asociaciones
- `PATCH /games/:id` acepta `title` con regeneración de slug
- RAWG lookup y detail endpoints para admin re-scrape
- Registro restringido a admin (`POST /auth/register` requiere token admin)
- Backlog update: `startedAt`, `finishedAt`, `realDuration`, `userRating`, `notes` aceptan `null` para limpiar valores

### Completado (Fase 1.5 — Beyond the Spreadsheet, en progreso)

- Backlog: startedAt/finishedAt cambiados a DATEONLY, userRating escala 0.5-5, game code en serializer
- Game releaseAt cambiado a DATEONLY
- GET /games: paginación con limit/offset/sort_by/genre filter
- Géneros: findRandomGenre service
- Wishlist serializer: ratio calculado, game code agregado
- Favorites serializer: game code agregado

### Pendiente (Fase 1.5)

- Backend: sort_by title/ratio/personalRatio para saved filters
- Frontend: Listas, Wishlist, Favorites, Saved Filters, Perfil, filtros avanzados
- Deploy al VPS: DB, env vars, migrar datos

### Pendiente — Fases posteriores

- Fase 2: Perfil público básico, ver juegos de amigos, onboarding, refresh tokens, migraciones DB
- Fase 3: Follow usuarios, listas públicas con suscripción, privacidad, búsqueda avanzada, sistema de invitación, badges manuales (founder, beta-tester, moderator, premium-supporter)
- Fase 4: Reviews, stats de listas públicas, logros, resumen semestral, comparación social
- Fase 5: Estabilización (paginación, emails, tests, seguridad)
- Fase 6: Premium (estadísticas, temas, Steam sync, listas colaborativas, Stripe)
- Fase 7: Recomendaciones, Xbox/PSN, app móvil, i18n

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
- Premium desbloquea: estadísticas avanzadas, temas, listas ilimitadas, sync Steam, listas colaborativas
- Pricing: Early Supporters $3 USD/mes (de por vida), público $5 USD/mes. Plan anual con descuento

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

---

## Ejemplo de datos del usuario

Así se ve la lista actual en Excel (extracto):

| N   | Juego                        | Plataforma | MC  | Duración | Ratio | Status      |
| --- | ---------------------------- | ---------- | --- | -------: | ----: | ----------- |
| 1   | Florence                     | Steam      | 82  |       1h | 82.00 | Completado  |
| 2   | Journey                      | Steam      | 92  |       2h | 46.00 | Completado  |
| 5   | Brothers: A Tale of Two Sons | Steam      | 86  |       3h | 28.67 | No Iniciado |
| 22  | Resident Evil 2              | PSX        | 89  |       6h | 14.83 | No Iniciado |
| 29  | Crash Bandicoot              | PSX        | 82  |       6h | 13.67 | Abandonado  |

**Resumen semestral:** 13 completados, 7 abandonados, 4 jugando, 3 mal optimizados = 27 total
