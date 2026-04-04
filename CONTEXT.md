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

### Ratio

```
ratio = GameShelf.score / GameShelf.duration
```

Mientras más alto el ratio, más "vale la pena" el juego (corto y bien puntuado). Ejemplo: Florence (82 pts, 1h) = ratio 82.00 vs Crash Bandicoot (82 pts, 6h) = ratio 13.67.

El score y la duration dependen de lo que el usuario eligió en su GameShelf (puede venir de Metacritic, OpenCritic, Completr community, o un valor manual).

### Ratio Personal

```
personal_ratio = GameShelf.score / Playthrough.real_duration
```

Se calcula desde el `Playthrough` completado. Si hay múltiples playthroughs completados, se usa el primero o el mejor. Permite comparar la estimación con la experiencia personal.

### Filtros guardados

Los usuarios pueden filtrar su backlog libremente (status, género, plataforma, semestre, ratio, etc.). Los filtros se pueden guardar como presets con un nombre (ej: "Juegos cortos de PS1"). Free: hasta 3 guardados, Premium: ilimitados.

### Estados de un juego

4 estados posibles en `Playthrough`:

- **No Iniciado** (`not_started`) — el usuario quiere jugar este juego pero aún no empezó
- **Jugando** (`playing`) — en progreso
- **Completado** (`completed`) — terminado, con fecha de finalización
- **Abandonado** (`abandoned`) — dejado, opcionalmente con motivo en notas

### Playthroughs (modelo inspirado en Trakt)

`Playthrough` es la tabla central de tracking. Contiene todo el historial del usuario:

- Cada vez que el usuario quiere jugar, inicia o reinicia un juego, se crea un nuevo playthrough
- Tiene su propio status, fechas, duración real, plataforma y notas
- Permite comparar experiencias: "lo completé en 8h en PSX, después en 5h en Steam"
- El estado actual de un juego se deriva del playthrough más reciente
- El `play_count` se calcula: `COUNT(playthroughs) WHERE gameId AND userId`

**Flujo:**

1. Usuario quiere jugar RE4 → se crea `Playthrough(#1, not_started)`
2. Lo empieza → `Playthrough(#1, playing)`
3. Lo completa → `Playthrough(#1, completed)`
4. Un año después lo rejuega → se crea `Playthrough(#2, playing)` (play_count ahora es 2)
5. Lo completa de nuevo → `Playthrough(#2, completed)`

### Vistas vs Listas

Concepto clave derivado del flujo actual en NocoDB:

**Vistas** = filtros sobre `Playthrough`. NO son listas separadas:

- "Pendientes" → `Playthrough` where status = `not_started`
- "Jugando" → `Playthrough` where status = `playing`
- "Completados" → `Playthrough` where status = `completed`
- "Semestre 2025-S01" → `Playthrough` where `finished_at` entre ene-jun 2025

**Listas** = colecciones curadas de juegos. Son entidades propias con dos tipos:

**`collection`** — Lista para organizar juegos:

- Muestra el estado del juego desde el playthrough más reciente del usuario
- Si ya completaste un juego, aparece como completado
- No crea playthroughs nuevos
- Ejemplos: "Saga Resident Evil", "RPGs favoritos", "TOP 30 para Anbernic RG40XX"
- El **Backlog por defecto** es una lista tipo `collection`
- Puede ser pública y seguida por otros usuarios

**`challenge`** — Lista con tracking propio desde cero:

- Al añadir un juego, se crea un nuevo `Playthrough` automáticamente
- El progreso es independiente del estado global
- Tiene `start_date`, `end_date` y `target_count` opcionales
- Ejemplos: "Semestre 2025-2", "Maratón horror octubre"
- Implementa el **reto semestral**: crear lista challenge con target_count: 25

### Semestres

No existe un campo "semestre" en el modelo. El semestre se deriva de `Playthrough.finished_at`: ene-jun = S01, jul-dic = S02. Las vistas semestrales son filtros por rango de fechas.

### Listas públicas y suscripción

Cualquier lista con `is_public: true` puede ser seguida por otros usuarios (`ListFollower`). Cuando un seguidor ve una lista pública:

- Ve todos los juegos de la lista con su propio estado (derivado de sus playthroughs)
- Ve su progreso: "18/30 completados"
- Para cada juego con múltiples playthroughs: ve cuántas veces lo ha completado
- Estadísticas agregadas: seguidores totales, cuántos la completaron al 100%

Ejemplo: Lista pública "Saga Resident Evil" con 15 juegos → un seguidor ve "he completado 8/15, RE4 lo completé 3 veces"

### Reto semestral

Se implementa como una lista tipo `challenge` con `start_date`, `end_date` y `target_count`. No requiere configuración especial del usuario — simplemente crea una lista challenge con su meta.

---

## Separación de módulos clave

### `games` vs `game-shelf` vs `lists` vs `playthroughs`

| Módulo             | Propósito                                              | Analogía                          |
| ------------------ | ------------------------------------------------------ | --------------------------------- |
| `games`            | Catálogo global de juegos (admin lo alimenta)          | La tienda de juegos               |
| `game-shelf`       | Juegos que **posee** el usuario con datos personales   | Tu estantería física              |
| `lists`            | Colecciones curadas (`collection` o `challenge`)       | Listas temáticas o sagas          |
| `list-followers`   | Suscripción a listas públicas de otros usuarios        | "Seguir esta lista"               |
| `playthroughs`     | Historial completo del usuario (quiere jugar, jugando, completado, abandonado) | Tu diario de gaming               |

- Un juego puede estar en `game-shelf` sin estar en ninguna lista
- Un juego puede estar en múltiples listas
- `game-shelf` tiene datos de colección: `notes`, `acquired_at`, `edition`
- `lists` tipo `collection` muestran estado derivado del playthrough más reciente; tipo `challenge` crean playthroughs nuevos
- `ListItem` tiene `playthrough_id` (nullable): null en collections, apunta a playthrough en challenges
- Las "vistas" (pendientes, jugando, semestre X) son filtros de API sobre `Playthrough`, no listas

### Lista Backlog

- Se crea automáticamente al registrar un usuario
- `is_default: true`, `type: collection` — no se puede eliminar ni renombrar
- Es la lista general de "juegos que quiero jugar"
- El reto semestral es una lista `challenge` separada

### Listas públicas seguibles

- Cualquier lista `is_public: true` se puede seguir (`ListFollower`)
- Los seguidores ven su propio progreso contra la lista
- Ejemplo: "TOP 30 para Anbernic RG40XX" → seguidor ve "18/30 completados"
- Estadísticas: seguidores totales, completados al 100%, juego más/menos completado

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
├── saved-filters/     # (pendiente) Filtros guardados del backlog
├── lists/             # (pendiente) Listas collection y challenge
├── playthroughs/      # (pendiente) Historial completo del usuario (not_started, playing, completed, abandoned)
├── rawg/              # Provider de RAWG API (géneros, descripción, scores, playtime, covers)
├── hltb/              # (pendiente) Provider de HowLongToBeat
├── metacritic/        # (pendiente) Provider de Metacritic/OpenCritic
├── steam/             # (pendiente) Provider de Steam API
├── database/          # Conexión, inicialización, asociaciones
└── common/            # Config, middlewares, errores, logger, utils
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
- Todos los modelos de DB creados: Game, Platform, Genre, GamePlatform, GameGenre, GameShelf, GameScore, GameTime, List, ListItem, ListFollower, Playthrough, SavedFilter
- Error handling completo en todos los módulos (registrados en normalizers globales)
- Validación UUID (`z.uuid()` de Zod v4) en todos los schemas de params
- RAWG provider implementado (`RawgProvider` class con searchGame, getGameById, getGameBySlug)
- Config separada: environment.config.ts, database.config.ts, api-keys.config.ts
- Infraestructura: error handling, logging, rate limiting, validación, CORS, Helmet
- Data maestra: 517 juegos enriquecidos con RAWG (descripciones, covers, fechas, géneros, scores RAWG, playtimes RAWG) + scores Metacritic y tiempos HLTB del CSV original

### Pendiente — Fase 1 (Excel Killer, solo yo)

- `Playthrough` services, controllers y routes (modelo ya existe)
- Vistas como filtros de API (pendientes, jugando, completados, por semestre/fecha)
- Módulo de Listas services, controllers y routes (`lists`, `list-items`) con tipos `collection` y `challenge`
- Transacciones en operaciones multi-paso
- HLTB/Metacritic auto-fetch (cron nocturno con providers)
- Serializer con `personal_ratio`
- Importación CSV

### Pendiente — Fases posteriores

- Fase 2: Perfil público básico, ver juegos de amigos, onboarding, refresh tokens, migraciones DB
- Fase 3: Follow usuarios, listas públicas con suscripción, privacidad, búsqueda avanzada, sistema de invitación
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
- Pricing: ~3 USD/mes o ~20 USD/año

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
| Google Drive           | Backups de listas                                 | Fase 6       |

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
