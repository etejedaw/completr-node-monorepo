# 🎮 Completr — Roadmap Unificado

> **Principio arquitectónico clave:** Cada usuario tiene una lista por defecto **imborrable** llamada "Backlog" (tipo `collection`). Las listas son un módulo propio, separado de `game-shelf` (que es el registro de los juegos que posee el usuario). Existen dos tipos de lista: **`collection`** (organizar juegos, muestra estado global) y **`challenge`** (tracking desde cero con meta, cada juego genera un nuevo playthrough). El estado global de un juego para el usuario vive en `UserGameStatus` y se actualiza automáticamente según el playthrough más reciente.

---

## 📆 Resumen cronológico

| Mes   | Etapa                                               |
| ----- | --------------------------------------------------- |
| 1     | Fase 0 — Setup y arquitectura                       |
| 2–3   | Fase 1 — Excel Killer (solo tú)                     |
| 3–4   | Fase 2 — MVP Amigos (5–20 personas)                 |
| 4–6   | Fase 3 — Beta Cerrada (50–200 usuarios, invitación) |
| 6–9   | Fase 4 — Beta Pública (500+ usuarios)               |
| 9–10  | Fase 5 — Estabilización y calidad                   |
| 10–12 | Fase 6 — Premium (desarrollo + lanzamiento)         |
| 12+   | Fase 7 — Escalamiento continuo                      |

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
- [x] **Game**: id (UUID), title, slug, description (TEXT), cover_url, release_at, is_dlc, parent_game_id (self-reference nullable para DLCs), is_active, created_at — `averageScore` y `averagePlaytime` eliminados, viven en `GameScore`/`GameTime`
- [x] **Platform**: id (UUID), name, slug, code
- [x] **Genre**: id (UUID), name, slug, code
- [x] **GamePlatform**: game*id, platform_id *(tabla pivote)\_
- [x] **GameGenre**: game_id, genre_id (tabla pivote)
- [x] **GameScore**: id (UUID), game_id, source (`metacritic` | `opencritic` | `rawg` | `completr`), score (number), updated_at — Puntajes globales por fuente. Unique index en (game_id, source). Datos en crudo (RAWG usa escala 0-5). Actualizado por cron mensual
- [x] **GameTime**: id (UUID), game_id, source (`hltb` | `rawg` | `completr`), duration (number), updated_at — Tiempos globales por fuente. Unique index en (game_id, source). Actualizado por cron mensual
- [x] **GameShelf**: id, user_id, game_id, user_rating (nullable), notes (nullable), acquired_at, score (nullable), duration (nullable), score_source (nullable), duration_source (nullable) — Registro de qué juegos tiene el usuario + puntaje/duración que eligió usar para su ratio
- [x] **List**: id (UUID), user_id, name, slug, type (`collection` | `challenge`), is_default (bool, para el Backlog imborrable), is_public (bool), start_date (nullable, solo challenges), end_date (nullable, solo challenges), target_count (nullable, ej: "completar 25 de esta lista"), created_at
- [x] **ListItem**: id, list_id, game_id, playthrough_id (nullable), position (int), score (nullable), duration (nullable), score_source (nullable), duration_source (nullable) — Datos de puntaje congelados al añadir a la lista, actualizables manualmente por el usuario
- [x] **SavedFilter**: id (UUID), user_id, name, filters (JSON), sort_by (nullable), sort_order, created_at — Filtros guardados del backlog. Free: hasta 3, Premium: ilimitados
- [x] **ListFollower**: id, list*id, user_id, is_visible (bool, default true — controla si el seguimiento aparece en el perfil público del usuario), followed_at — \_Permite a usuarios seguir listas públicas de otros. El progreso se calcula cruzando los juegos de la lista con el `UserGameStatus` del seguidor. Visibilidad: `User.isPublic AND ListFollower.isVisible`*
- [x] **UserGameStatus**: user*id, game_id (PK compuesta), status (`not_started` | `playing` | `completed` | `abandoned`), play_count (int), updated_at — \_Estado global del juego para el usuario. Se actualiza automáticamente según el playthrough más reciente*
- [x] **UserPlaythrough (Playthrough)**: id (UUID), user*id, game_id, platform_id, status (`playing` | `completed` | `abandoned`), started_at, finished_at (nullable), real_duration (nullable), notes (nullable) — \_Historial de partidas individuales. Cada vez que el usuario inicia o reinicia un juego se crea un nuevo registro. El número de playthrough se calcula en el serializer ordenando por `started_at`*
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
**Condición de éxito:** Puedes importar tu CSV, ver la lista ordenada por ratio, filtrar por semestre y trackear playthroughs.

> 👤 _Release interna — solo tú lo usas._

### Módulo de Juegos (catálogo global)

- [x] `POST /games` — Crear juego (solo admin/owner)
- [x] `GET /games` — Listar juegos con búsqueda básica y filtros por plataforma/género
- [x] `GET /games/:id` — Detalle de juego
- [x] `PATCH /games/:id` — Editar juego
- [x] `DELETE /games/:id` — Eliminar juego
- [x] Serializer de juego (expone `ratio = metacritic_score / hltb_duration` calculado en backend)
- [x] Schemas de validación: `register-game.schema.ts`, `update-game.schema.ts`

### Módulo de Game Shelf (librería del usuario)

- [x] `POST /game-shelf` — Añadir un juego a la librería del usuario
- [x] `GET /game-shelf/me` — Ver mi librería completa
- [x] `PATCH /game-shelf/:id` — Actualizar `user_rating`, `real_duration`, `notes`
- [x] `DELETE /game-shelf/:id` — Quitar juego de la librería
- [x] Serializers (full, me, tiny) con score, duration, scoreSource, durationSource y ratio calculado (`score / duration`)
- [x] Serializer con `personal_ratio = GameShelf.score / Playthrough.real_duration` cuando `real_duration` esté disponible (usa el primer playthrough completado)

### Módulo de Playthroughs y estado global

- [ ] `UserGameStatus` se crea automáticamente al primer playthrough de un juego (status: `playing`, play_count: 1)
- [ ] `UserGameStatus.status` se actualiza automáticamente según el playthrough más reciente:
    - Playthrough completado → status: `completed`
    - Playthrough abandonado → status: `abandoned`
    - Nuevo playthrough iniciado → status: `playing`, play_count +1
- [ ] `PATCH /playthroughs/:id` — Actualizar un playthrough (cambiar status a `completed`/`abandoned`, agregar `real_duration`, `finished_at`, `notes`)
- [ ] `GET /users/me/playthroughs` — Ver historial de playthroughs del usuario
- [ ] `GET /users/me/playthroughs?game_id=:id` — Ver playthroughs de un juego específico

### Vistas (filtros sobre playthroughs y estado global)

> Las "vistas" no son listas separadas — son query filters sobre `UserGameStatus` y `UserPlaythrough`. Replican el comportamiento actual de NocoDB donde las vistas son filtros sobre la misma tabla.

- [ ] `GET /users/me/games?status=not_started` — Vista "Pendientes" (juegos sin iniciar)
- [ ] `GET /users/me/games?status=playing` — Vista "Jugando" (juegos en progreso)
- [ ] `GET /users/me/games?status=completed` — Vista "Completados" (todos los completados)
- [ ] `GET /users/me/games?status=abandoned` — Vista "Abandonados"
- [ ] `GET /users/me/games?from=2025-01-01&to=2025-06-30` — Vista "Semestre 2025-S01" (filtro por rango de fechas de `finished_at` en playthroughs)
- [ ] Soportar combinación de filtros: `?status=completed&from=2025-07-01&to=2025-12-31` (completados del semestre 2025-S02)
- [ ] Cada resultado incluye: juego, plataforma, estado global, play_count, datos del playthrough relevante

### Transacciones en operaciones multi-paso

- [ ] Implementar transacciones de Sequelize en operaciones que involucran múltiples modelos (ej: crear challenge + playthrough + listItem, importar CSV con múltiples inserts)
- [ ] Refactorizar `games.service.ts → registerGame` para usar transacción (actualmente crea juego + vincula plataformas sin atomicidad)

### Módulo de Listas

- [ ] Al registrarse un usuario, crear automáticamente su lista **"Backlog"** con `is_default: true, type: collection` (no se puede eliminar ni renombrar)
- [ ] `GET /lists/me` — Ver mis listas
- [ ] `POST /lists` — Crear lista (el usuario elige `type: collection | challenge`; si es challenge puede definir `start_date`, `end_date`, `target_count`)
- [ ] `PATCH /lists/:id` — Renombrar lista / cambiar visibilidad pública (no se puede cambiar el `type` después de creada)
- [ ] `DELETE /lists/:id` — Eliminar lista (bloqueado si `is_default: true`)
- [ ] `POST /lists/:id/items` — Añadir juego a una lista
    - Si la lista es `collection`: crea ListItem sin playthrough, el estado se resuelve desde `UserGameStatus`
    - Si la lista es `challenge`: crea ListItem + nuevo `UserPlaythrough` automáticamente
- [ ] `DELETE /lists/:id/items/:itemId` — Quitar juego de una lista
- [ ] `PATCH /lists/:id/items/:itemId` — Actualizar posición del ítem

### Módulo de Usuarios (perfil)

- [x] `GET /users/me` — Ver mi perfil
- [x] `PATCH /users/me` — Editar datos básicos (username, avatar_url)
- [x] `PATCH /auth/password` — Cambiar contraseña
- [x] Serializer de usuario (nunca expone `password_hash`)

### Cálculo del Ratio

- [x] Lógica en el Serializer/Service: `ratio = score / duration`
- [ ] `personal_ratio = GameShelf.score / Playthrough.real_duration` (calculado desde el playthrough completado; si hay múltiples, usar el primero o el mejor)
- [ ] Ordenamiento de listas por ratio, nota, duración
- [ ] El score y duration vienen de `GameShelf` (lo que el usuario eligió). En listas vienen de `ListItem` (congelados)

### Integración automática con HowLongToBeat y Metacritic/OpenCritic

- [ ] Al crear un juego nuevo, marcarlo como `metadata_pending: true`
- [ ] Implementar cola de tareas con `node-cron` (o BullMQ+Redis si se escala) para scraping nocturno
    - [ ] Job nocturno: buscar juegos con `metadata_pending: true`, obtener `hltb_duration` de HLTB y `metacritic_score` de Metacritic/OpenCritic, actualizar el registro y setear `metadata_pending: false`
- [ ] Manejo de errores del scraper: reintentos, logging de fallos, fallback a datos manuales
- [ ] Evaluar OpenCritic como alternativa/complemento a Metacritic según disponibilidad de API

### Importación manual

- [ ] `POST /import/csv` — Endpoint para subir CSV con columnas: `title`, `platform`, `metacritic_score`, `hltb_duration`, `real_duration`, `status`, `finished_at`, `notes`
- [ ] Servicio de parseo y validación del CSV
- [ ] Lógica de match con juegos existentes en el catálogo (por título/slug) o creación de juego básico con `metadata_pending: true` si no existe
- [ ] Mapeo de cada fila al nuevo modelo:
    - Crear/vincular `Game` en el catálogo
    - Crear `GameShelf` entry (el usuario posee el juego)
    - Crear `UserGameStatus` con el status de la fila
    - Si status es `completed`/`abandoned`/`playing`: crear `UserPlaythrough` con `real_duration`, `finished_at`, `notes`
    - Derivar semestre desde `finished_at` (ene-jun = S01, jul-dic = S02); filas sin fecha → `UserGameStatus` con status `not_started`
- [ ] Reporte de filas con errores al importar

### UI básica _(si aplica en esta fase)_

- [ ] Frontend con Angular
- [ ] Configurar como PWA (`@angular/pwa`): service worker, manifest, instalable en móvil
- [ ] Vista de lista/tabla del backlog con columnas: título, plataforma, ratio, duración, nota, estado
- [ ] Ordenamiento y filtrado básico en el frontend
- [ ] Vista de progreso básico del backlog

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

### Perfil público básico

- [ ] `GET /users/:username` — Página pública con estadísticas básicas:
    - Total de juegos completados
    - Total abandonados
    - Juegos en progreso
    - Ratio promedio
    - Total de playthroughs (incluye replays)
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

### Onboarding para amigos

- [ ] Flujo de registro limpio y funcional
- [ ] CSV import funcional para que amigos migren sus propios datos
- [ ] Corrección de bugs encontrados en Fase 1

---

## 🟦 FASE 3 — Beta Cerrada _(~2–3 meses)_

**Objetivo:** Validar que la app genera interés real fuera de tu círculo cercano. Sistema de invitación.
**Condición de éxito:** Usuarios que no conoces usan la app regularmente y completan juegos.

> 🔒 _Beta por invitación — 50 a 200 usuarios._

### Sistema social

- [ ] `POST /users/:username/follow` — Seguir a un usuario
- [ ] `DELETE /users/:username/follow` — Dejar de seguir
- [ ] `GET /users/:username/followers` — Ver seguidores
- [ ] `GET /users/:username/following` — Ver a quién sigo
- [ ] Feed de actividad pública: "X completó Y", "X añadió Y a su backlog"
- [ ] `GET /feed` — Endpoint de actividad de usuarios seguidos

### Listas públicas y suscripción

- [ ] `POST /lists/:id/follow` — Seguir/suscribirse a una lista pública (por defecto `is_visible: true`)
- [ ] `PATCH /lists/:id/follow` — Cambiar visibilidad del seguimiento (`is_visible: true/false`)
- [ ] `DELETE /lists/:id/follow` — Dejar de seguir una lista
- [ ] `GET /lists/:id/followers` — Ver seguidores de una lista (cantidad y usuarios)
- [ ] `GET /lists/following` — Ver las listas públicas que sigo
- [ ] Al ver una lista seguida, mostrar el progreso personal del usuario:
    - Cuántos juegos de la lista ha completado: "18/30 completados"
    - Cuáles faltan por completar
    - Para cada juego: su `UserGameStatus` (completado, no iniciado, etc.) y `play_count`
    - Para juegos con múltiples playthroughs: mostrar cuántas veces se ha completado cada uno

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

### Sistema de invitación

- [ ] Registro solo por código de invitación
- [ ] Cada usuario puede generar N invitaciones
- [ ] Tracking de quién invitó a quién (útil para badges futuros)

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

### Logros y milestones (free)

- [ ] Sistema de logros automáticos: "Completaste 50 juegos!", "5 juegos en un mes!", "Primera saga completada!"
- [ ] Logros visibles en el perfil público
- [ ] Notificación al desbloquear un logro

### Resumen semestral básico (free)

- [ ] Resumen automático al cierre de semestre: "En 2025-S01 completaste 18 juegos, tu género favorito fue Survival Horror, tu juego más rápido fue Florence (30 min)"
- [ ] Visible en el perfil y compartible

### Notificación de progreso del challenge (free)

- [ ] "Llevas 12/25 del semestre, vas al 48% con 2 meses restantes"
- [ ] Recordatorios opcionales de progreso

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
- [ ] Sistema de "motivo de abandono" al marcar un playthrough como `abandoned` (se usa el campo `notes` del playthrough)
- [ ] Exportar listas: `GET /lists/:id/export?format=csv` y `?format=json`
- [ ] Historial de actividad del usuario por período (semestre/año)

### Emails transaccionales

- [ ] Email de bienvenida al registrarse
- [ ] Email de recuperación de contraseña (`POST /auth/forgot-password`, `POST /auth/reset-password`)
- [ ] Integrar proveedor SMTP (Resend, SendGrid o similar)

### Hardening

- [ ] Auditoría de seguridad básica (headers, sanitización de inputs, rate limits por endpoint)
- [ ] Optimizar queries N+1 en Sequelize (eager loading)
- [ ] Tests de integración para los flujos principales (auth, listas, game-shelf, playthroughs)

---

## ⭐ FASE 6 — Premium _(~2–3 meses desarrollo + 1 mes lanzamiento)_

**Objetivo:** Construir y lanzar Premium de forma suave y no agresiva. Sin paywalls incómodos.

> 🔥 Filosofía: _"Si te gusta Completr, esta versión es para apoyar el proyecto."_ (estilo Trakt)

### Estadísticas avanzadas (premium)

- [ ] Gráficos por género (distribución de juegos completados por género)
- [ ] Gráficos por plataforma
- [ ] Evolución del backlog por semestre/año
- [ ] Velocidad de completado (promedio de días entre `started_at` y `finished_at` en `UserPlaythrough`)
- [ ] Patrones de abandono (géneros o plataformas con mayor tasa de abandono)
- [ ] Panel "Insights del Jugador"
- [ ] Resumen semestral/anual detallado con gráficos (versión premium del Wrapped)
- [ ] Historial de estadísticas: cómo cambiaron tus hábitos entre años
- [ ] Comparación lado a lado con amigos (stats, juegos en común, quién completa más)

### Personalización (premium)

- [ ] Temas visuales: dark, minimal, retro, sepia, hacker
- [ ] Avatares personalizados (upload de imagen)
- [ ] Badges de "Early Supporter" para los primeros usuarios registrados
- [ ] Personalizar URL del perfil público

### Ratio personalizable (premium)

- [ ] Cambiar la fórmula del ratio (ej: dar más peso a la nota, ponderar por género)
- [ ] Algoritmos de ordenamiento personalizados

### Listas y colaboración (premium)

- [ ] Límite de listas en plan gratuito: máximo 5 listas (la lista Backlog no cuenta)
- [ ] Listas ilimitadas como feature Premium
- [ ] Modo colaborativo: invitar a otro usuario a una lista compartida, con roles (editor/viewer)

### Sincronización con Steam (premium)

- [ ] Guardar `steam_id` en modelo `User` (`PATCH /users/me/steam-id`)
- [ ] `POST /users/sync/steam` — Disparar sincronización manual con Steam
    - [ ] Consumir API pública de Steam: `GetOwnedGames`
    - [ ] Crear o actualizar entradas en `GameShelf` con los juegos de Steam
- [ ] Worker Service en `src/integrations/steam/`:
    - [ ] Sincronización automática periódica (cron)
    - [ ] Comparar `playtime_forever` de Steam con `hltb_duration` para calcular `personal_ratio` ajustado

### Conveniencia (premium)

- [ ] Backup automático de listas y shelf a Google Drive (OAuth, ruta configurable por el usuario)
- [ ] Exportar a JSON (además de CSV que es free)
- [ ] Prioridad en el fetch de metadata de HLTB/Metacritic
- [ ] Notificaciones: "Tu amigo X completó un juego de tu lista", "Nuevo juego añadido a la lista que sigues"
- [ ] API personal: acceso a una API de tu propia data para integraciones (webhooks, Discord bot, etc.)

### Feature flags

- [ ] Implementar sistema de feature flags por usuario (para activar/desactivar Premium internamente sin deployar)

### Infraestructura de pagos

- [ ] Integrar Stripe (u otro proveedor: LemonSqueezy, Paddle)
- [ ] Modelo de suscripción: mensual (~3 USD/mes) y anual (~20 USD/año)
- [ ] Webhooks para activar/desactivar plan Premium en tiempo real
- [ ] Endpoint `GET /users/me/subscription` — Estado actual de suscripción
- [ ] Manejo de expiración, cancelación y reactivación

### Lanzamiento

- [ ] Página "Completr Premium" con comparativa FREE vs PREMIUM
- [ ] Regalo: 1 mes gratis de Premium para todos los usuarios activos al momento del lanzamiento
- [ ] Banner no intrusivo en la app para usuarios Free
- [ ] Activar feature flags Premium para suscriptores

---

## 🟩 FASE 7 — Escalamiento Continuo _(12+ meses)_

**Objetivo:** Mejorar retención, engagement y expandir la plataforma.

### Features futuras (por priorizar según feedback)

- [ ] Recomendaciones: "¿Qué jugar ahora?" basado en ratio, duración disponible y género favorito (sin IA al inicio, algoritmo simple; con IA en versión premium futura)
- [ ] Análisis automático del período/semestre: resumen generado con IA (premium)
- [ ] Integración con Xbox/PSN (si APIs lo permiten)
- [ ] Mapa de calor estilo GitHub de sesiones de juego (usando `started_at`/`finished_at` de `UserPlaythrough`)
- [ ] App nativa (React Native o Flutter) solo si el volumen y las necesidades (push notifications nativas, integraciones con hardware) lo justifican. Mientras tanto, la PWA cubre el caso de uso móvil
- [ ] Tareas inteligentes del backlog: "Juega 2 horas esta semana a X"
- [ ] Migrar cola de tareas de `node-cron` a BullMQ + Redis si el volumen lo justifica
- [ ] CDN para imágenes de portadas
- [ ] Internacionalización (i18n)

---

## 💎 Comparativa FREE vs PREMIUM

> Filosofía: Free es una experiencia completa para gestionar tu backlog. Premium agrega insights, personalización y conveniencia.

| Feature                               | Free                           | Premium                       |
| ------------------------------------- | ------------------------------ | ----------------------------- |
| **Tracking de juegos y playthroughs** | ✅ Completo                    | ✅ Completo                   |
| **Vistas/filtros (status, semestre)** | ✅                             | ✅                            |
| **Listas (collection + challenge)**   | ✅ Hasta 5 (Backlog no cuenta) | ✅ Ilimitadas                 |
| **CSV import**                        | ✅                             | ✅                            |
| **Ratio y personal ratio**            | ✅                             | ✅ + Fórmula personalizable   |
| **Fuentes de score**                  | ✅ Completr community + manual | ✅ + Metacritic, OpenCritic   |
| **Filtros del backlog**               | ✅ Ilimitados                  | ✅ Ilimitados                 |
| **Filtros guardados**                 | ✅ Hasta 3                     | ✅ Ilimitados                 |
| **HLTB auto-fetch**                   | ✅                             | ✅ Prioridad en cola          |
| **Perfil público**                    | ✅                             | ✅ + URL personalizada        |
| **Follow usuarios**                   | ✅                             | ✅                            |
| **Seguir listas públicas + progreso** | ✅                             | ✅                            |
| **Reviews**                           | ✅                             | ✅                            |
| **Búsqueda y ordenamiento**           | ✅                             | ✅                            |
| **Logros/milestones**                 | ✅                             | ✅                            |
| **Resumen semestral**                 | ✅ Básico (texto)              | ✅ Detallado (gráficos)       |
| **Notificación de progreso**          | ✅                             | ✅                            |
| **Exportar**                          | ✅ CSV                         | ✅ CSV + JSON                 |
| **Estadísticas avanzadas**            | ❌                             | ✅ Gráficos, trends, patrones |
| **Comparación con amigos**            | ❌                             | ✅ Side-by-side stats         |
| **Temas visuales**                    | ❌                             | ✅ dark, retro, minimal, etc. |
| **Avatar personalizado**              | ❌                             | ✅ Upload                     |
| **Listas colaborativas**              | ❌                             | ✅ Roles editor/viewer        |
| **Sync Steam**                        | ❌                             | ✅ Auto-import + playtime     |
| **Backup Google Drive**               | ❌                             | ✅ Automático                 |
| **Notificaciones sociales**           | ❌                             | ✅                            |
| **API personal**                      | ❌                             | ✅ Webhooks, integraciones    |
| **Badge Supporter**                   | ❌                             | ✅                            |

---

## 🛠️ Notas arquitectónicas transversales

Estas decisiones aplican a **todo el proyecto**, no son una fase:

- **Separación `games` vs `game-shelf`:** `games` es el catálogo global (admin lo alimenta). `game-shelf` es la relación usuario↔juego con sus datos personales (`user_rating`, `real_duration`, `notes`). No mezclarlos.
- **Separación `game-shelf` vs `lists`:** `game-shelf` registra qué juegos tiene el usuario. `lists` y `list-items` gestionan las colecciones organizadas. Un juego puede estar en `game-shelf` sin estar en ninguna lista, y en varias listas a la vez.
- **Dos tipos de lista (`collection` vs `challenge`):**
    - `collection`: Lista para organizar juegos (ej: "Juegos de PS1", "RPGs favoritos", el Backlog por defecto). Muestra el estado global del juego desde `UserGameStatus`. No crea playthroughs.
    - `challenge`: Lista con tracking propio (ej: "Semestre 2025-2", "Maratón horror"). Al añadir un juego, se crea un nuevo `UserPlaythrough` automáticamente. Tiene `start_date`, `end_date` y `target_count` opcionales. Todo empieza desde cero independiente del estado global.
- **Estado global (`UserGameStatus`) vs playthroughs (`UserPlaythrough`):** El estado global es la fuente de verdad sobre si un juego fue completado alguna vez. Se actualiza automáticamente según el playthrough más reciente. Los playthroughs son el historial de partidas individuales con sus fechas, duración, plataforma y notas. Modelo inspirado en Trakt: un juego se completa una vez globalmente; si se rejuega, se añade un nuevo playthrough.
- **Vistas ≠ Listas:** Las vistas (pendientes, jugando, completados, por semestre) son **filtros sobre `UserGameStatus` y `UserPlaythrough`**, no listas separadas. Las listas son colecciones curadas (sagas, temáticas, challenges). Esto replica el modelo mental de NocoDB donde las vistas son filtros sobre la misma tabla.
- **Semestre = filtro por fecha:** No existe un campo "semestre". El semestre se deriva de `UserPlaythrough.finished_at`: ene-jun = S01, jul-dic = S02. Las vistas semestrales son simplemente filtros por rango de fechas.
- **Listas públicas y suscripción:** Cualquier lista con `is_public: true` puede ser seguida por otros usuarios. Los seguidores ven su propio progreso contra la lista (cruzando `ListItem.game_id` con su `UserGameStatus`). Las estadísticas de la lista (seguidores, % completado) se calculan en backend.
- **Privacidad en dos niveles:** `User.isPublic` controla si el perfil es visible. `ListFollower.isVisible` controla si un seguimiento específico aparece en el perfil público. La regla es: `visible = User.isPublic AND ListFollower.isVisible`. Si el perfil es privado, nada es visible independientemente del `isVisible` de cada lista.
- **UUIDs en Foreign Keys:** Definir explícitamente el tipo UUID en todas las relaciones de `associations.database.ts` para evitar bugs con Sequelize.
- **Serializer Pattern:** Toda la lógica de cálculo (ratio, personal_ratio, estadísticas) vive en el backend dentro de los serializers/services. El frontend solo renderiza.
- **`metadata_pending`:** Cualquier juego creado manualmente nace con `metadata_pending: true`. El worker nocturno se encarga de enriquecerlo con datos de HLTB y Metacritic.
- **Lista Backlog por defecto:** Se crea automáticamente al registrar un usuario. `is_default: true`, `type: collection`. No puede eliminarse ni renombrarse. El reto semestral se implementa como una lista `challenge` separada.
- **`personal_ratio`:** Se calcula desde `UserPlaythrough.real_duration` del playthrough completado. Si hay múltiples playthroughs completados, se usa el primero o el mejor según preferencia.
- **Sistema de puntajes en 3 niveles:**
    - `GameScore` — Catálogo global de puntajes/tiempos por fuente (Metacritic, OpenCritic, HLTB, Completr community). Actualizado por cron mensual. La ficha del juego muestra todos los disponibles.
    - `GameShelf` — Puntaje/duración que el usuario eligió para su backlog. Se precarga al añadir un juego, editable manualmente. Determina el ratio en el backlog.
    - `ListItem` — Puntaje/duración congelados al añadir a una lista. No editables manualmente, solo con "actualizar puntajes" o "elegir fuente". Las listas no permiten valores custom, solo fuentes oficiales.
- **Filtros guardados (`SavedFilter`):** Los usuarios pueden filtrar su backlog libremente (status, género, plataforma, semestre, etc.). Los filtros se pueden guardar con un nombre. Free: hasta 3 guardados. Premium: ilimitados. Los filtros guardados son presets de query params, no listas.
