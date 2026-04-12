# Completr Frontend — Roadmap

> El frontend se desarrolla en paralelo con el backend. Cada fase corresponde a las mismas fases del backend. El backend calcula todo (ratios, estadísticas, datos derivados) — el frontend solo renderiza.

---

## Resumen cronológico

| Fase     | Etapa                                                 | Release  |
| -------- | ----------------------------------------------------- | -------- |
| Fase 0   | Setup y arquitectura base                             | `v0.1.0` |
| Fase 1   | Excel Killer (solo tú)                                | `v0.2.0` |
| Fase 1.5 | Beyond the Spreadsheet (mejoras + deploy)             | `v0.2.x` |
| Fase 2   | MVP Amigos (5–20 personas)                            | `v0.3.0` |
| Fase 3   | Beta Cerrada (50–200 usuarios, invitación)            | `v0.4.0` |
| Fase 4   | Beta Pública (500+ usuarios)                          | `v1.0.0` |
| Fase 5   | Estabilización y calidad                              | `v1.1.0` |
| Fase 6   | Premium                                               | `v2.0.0` |
| Fase 7   | Escalamiento continuo                                 | `v2.x.x` |

---

## FASE 0 — Setup y Arquitectura

**Objetivo:** Estructura del proyecto, servicios base, auth, navegación.

### Estructura del proyecto

- [x] Crear estructura de carpetas: `core/`, `shared/`, `features/`, `environments/`
- [x] Configurar `environments/` con `apiUrl` para dev y producción
- [x] Configurar `fileReplacements` en `angular.json` para producción

### Core services

- [x] `AuthService` — Login, registro, token storage, estado de sesión con signals
- [x] `StorageService` — Abstracción sobre localStorage para token

### HTTP

- [x] Configurar `provideHttpClient()` con interceptors en `app.config.ts`
- [x] `authInterceptor` — Agrega Bearer token a cada request autenticada
- [x] `errorInterceptor` — Manejo global de errores HTTP (401 → redirect a login)

### Auth guard

- [x] `authGuard` — Protege rutas que requieren login (redirect a `/login`)
- [x] `guestGuard` — Protege login/registro si ya estás autenticado (redirect a `/backlog`)

### Routing base

- [x] Configurar lazy loading por feature en `app.routes.ts`
- [x] Layout principal con sidebar y navegación
- [x] Rutas: `/login`, `/register`, `/backlog`, `/game-shelf`, `/lists`, `/wishlist`, `/favorites`, `/profile`
- [x] Componentes placeholder por feature (todos compilan con lazy loading)

### Modelos/interfaces

- [x] Crear interfaces TypeScript: `Game`, `Platform`, `Genre`, `BacklogEntry`, `List`, `ListItem`, `WishlistEntry`, `FavoriteEntry`, `User`, `SavedFilter`, `GameShelfEntry`

### PWA

- [x] Configurar como PWA (`@angular/pwa`): service worker, manifest, iconos, instalable en móvil
- [x] Service worker activo solo en producción (`isDevMode()` check)

---

## FASE 1 — Excel Killer

**Objetivo:** Reemplazar la hoja de cálculo. Ver backlog con ratios, filtrar, gestionar listas.
**Condición de éxito:** Puedes ver tu backlog ordenado por ratio, filtrar por semestre, gestionar wishlist y favoritos.

> Solo tú lo usas.

### Feature: Auth

- [x] Pantalla de login (email + password)
- [x] Pantalla de registro (username, email, password, name)
- [x] Redirect automático post-login a `/backlog`
- [x] Logout (limpiar token, redirect a login)

### Feature: Backlog (pantalla principal)

- [x] Vista de tabla del backlog con columnas: cover, título, plataforma, score, duration, ratio, realDuration, personalRatio, userRating, finishedAt, status, notes
- [x] Ordenamiento por columna: title, ratio y personalRatio se ordenan en frontend (campos calculados/relación); score, duration, realDuration, userRating, finishedAt y status se ordenan via backend
- [x] Filtros por status con tabs (All, Not Started, Playing, Completed, Abandoned)
- [x] Status badges con colores por estado
- [x] Tabla se mantiene visible al cambiar filtros (sin flicker de loading)
- [x] Crear nueva entrada de backlog (modal con búsqueda de juego, debounce, force search RAWG)
- [x] Precarga automática de score y duration desde la mejor fuente disponible
- [x] Selector de plataformas filtrado por plataformas del juego
- [x] Editar entrada (click en fila, modal precargado, campos nullable para limpiar valores)
- [x] Eliminar entrada (con confirmación inline)
- [x] Búsqueda local por título en la tabla
---

## FASE 1.5 — Beyond the Spreadsheet

**Objetivo:** Mejorar la experiencia más allá del backlog. Agregar las demás vistas, filtros avanzados y deploy.
**Condición de éxito:** Todas las features de gestión personal funcionan y la app está desplegada en el VPS.

> Sigue siendo solo tú, pero con una experiencia más completa.

### Mejoras al Backlog

- [x] Normalización de scores a escala Completr (botón en modal, usa GET /score-sources)
- [x] Filtros avanzados: plataforma, rangos de fechas, multi-status, rating con estrellas, sort
- [x] Saved filters integrados en panel de filtros (crear, aplicar, actualizar, limpiar)
- ~~Vista de progreso básico del backlog~~ → movido a listas (Fase 3: progreso personal en listas)

### Feature: Game Shelf

- [x] Vista de mi colección con tabla, búsqueda local y CRUD modal
- [x] Título del juego clickeable → navega a ficha del juego
- [x] Extra: filtro por plataforma (chips con contador)
- [x] Extra: contador de juegos por plataforma

### Feature: Games (Browse + Detail)

- [x] Vista `/games` con secciones: Latest Added, género random, Completr Lists (placeholder), Top Rated
- [x] Grid de carátulas clickeables con título
- [x] Barra de búsqueda con debounce y fallback a RAWG
- [x] Vista `/games/:code` con banner, tags, stats (Completr section + Scores + Durations), descripción
- [x] Completr section: ratio (destacado), score con estrellas + label, duration
- [x] Favorite toggle en banner (estrella dorada)
- [x] Action buttons: Add to Backlog (modal), Add to Shelf (modal), Add to Wishlist (placeholder)
- [x] Modals con game precargado y bloqueado (preselectedGame)
- [x] Similar Games por género
- [x] Community placeholder, Featured in Lists placeholder
- [x] Título clickeable en backlog y game-shelf → navega a ficha

### Feature: Listas

- [x] Vista `/lists` con grid de cards (nombre, descripción, público/privado, sources)
- [x] Crear lista (modal con nombre, descripción, isPublic toggle, scoreSource, durationSource)
- [x] Detalle `/lists/:id` con items: posición, cover, título (link), score, duration, ratio, backlog icon
- [x] Agregar juegos via buscador con debounce
- [x] Reordenar items (flechas arriba/abajo)
- [x] Quitar items
- [x] Editar lista (modal desde detalle)
- [x] Eliminar lista (redirect a /lists)
- [x] Refresh scores
- [x] Frozen banner cuando el usuario excede límite free
- [x] Ícono backlog binario (gris=no está, cyan=está) — clickeable para abrir backlog modal si no está

### Feature: Wishlist

- [x] Vista tabla con posición, imagen, título (link), plataforma, score, duration, ratio, status, reorder (flechas), remove
- [x] Agregar desde backlog: modal con lista filtrable de backlogs (not_started/playing)
- [x] Agregar desde game detail: botón con selector de plataforma
- [x] Agregar desde backlog tabla: botón corazón por fila (rojo si ya está en wishlist)
- [x] Toggle wishlist en backlog modal (crear y editar)
- [ ] Indicador visual cuando un item se auto-remueve al completar/abandonar

### Feature: Favorites

- [x] Vista grid de carátulas con título (link), botón X al hover para quitar
- [x] Toggle favorito desde game detail (estrella en banner)
- [x] FavoritesService con toggle y replaceFavorites

### Feature: Saved Filters

- [x] Guardar combinación actual de filtros del backlog como vista con nombre
- [x] Listar mis filtros guardados (chips en backlog + página dedicada `/saved-views`)
- [x] Aplicar filtro guardado (click en chip o desde saved views page → navega a backlog)
- [x] Editar y eliminar filtros guardados (modal en saved views page)
- [x] `showInBacklog` toggle — controla si el chip aparece en el backlog
- [x] `isDefault` toggle — auto-aplica la vista al abrir el backlog
- [x] Descripción del filtro visible al seleccionarlo en el backlog

### Feature: Perfil

- [ ] Vista `/profile` con datos del usuario (username, avatar, bio)
- [ ] Editar perfil (username, avatar_url)

### Deploy

- [ ] Deploy del frontend al VPS
- [ ] Configurar proxy/nginx para servir frontend + backend

---

## FASE 2 — MVP Amigos

**Objetivo:** Tus amigos pueden crear cuenta, ver tu perfil y backlog público.

> 5–20 amigos.

### Panel admin de juegos

- [x] Admin editor en game-detail: fetch RAWG por slug, editar todos los campos (título, descripción, plataformas, géneros, scores, times, DLC con parent game por slug), guardar con externalIds
- [x] Admin editor en games-browse: crear juegos vacíos o desde RAWG fetch, misma interfaz que editar
- [x] AdminGameEditor component reutilizable en modo crear y editar
- [ ] Ruta `/admin/games` protegida por rol admin/moderator — tabla de todos los juegos con búsqueda

### Perfil público

- [ ] Vista `/users/:username` con estadísticas: juegos completados, abandonados, en progreso, ratio promedio
- [ ] Widget "Jugando ahora" (juegos con status playing)
- [ ] Listas públicas del usuario

### Vistas públicas

- [ ] Backlog público de otro usuario (`/users/:username/backlog`)
- [ ] Game shelf público (`/users/:username/game-shelf`)
- [ ] Wishlist pública (`/users/:username/wishlist`)
- [ ] Favoritos públicos (`/users/:username/favorites`)
- [ ] Listas públicas por URL (`/lists/:id`)

### Onboarding

- [ ] Flujo de registro pulido para amigos
- [ ] Empty states con instrucciones claras ("Agrega tu primer juego")

### Panel admin de usuarios

- [ ] Ruta `/admin/users` protegida por rol admin
- [ ] Formulario para crear usuarios manualmente (username, email, password, name, role)
- [ ] Botón de registro público bloqueado (registro solo via admin hasta beta pública)

---

## FASE 3 — Beta Cerrada

**Objetivo:** Validar que la app genera interés fuera del círculo cercano. Sistema de invitación.

> 50–200 usuarios por invitación.

### Social

- [ ] Follow/unfollow usuarios
- [ ] Feed de actividad: "X completó Y", "X añadió Y a su backlog"
- [ ] Ver seguidores/siguiendo en perfil
- [ ] Seguir listas públicas + ver progreso personal

### Privacidad

- [ ] Respetar `isPublic` en todas las vistas de otros usuarios
- [ ] Toggle de visibilidad en perfil para wishlist y favoritos

### Búsqueda avanzada

- [ ] Filtros combinados: género, plataforma, estado, ratio, duración
- [ ] Búsqueda con debounce y resultados en tiempo real

### Sistema de invitación

- [ ] Registro solo con código de invitación
- [ ] Generar y compartir invitaciones

### Badges

- [ ] Mostrar badges del usuario en su perfil
- [ ] Iconos/tooltips para cada tipo de badge

### "¿Dónde iba?" (notas de progreso)

- [ ] Notas rápidas visibles al ver un juego en progreso

### Backlog randomizer

- [ ] Botón "¿Qué juego?" con filtros opcionales

### Landing page

- [ ] Crear landing con descripción de Completr y formulario de solicitar invitación (Astro, separado)

---

## FASE 4 — Beta Pública

**Objetivo:** Registro abierto. Validar retención y UX a escala.

> 500+ usuarios.

### Reviews

- [ ] Crear/editar/eliminar review de un juego
- [ ] Ver reviews públicas en ficha del juego

### Estadísticas de listas

- [ ] Número de seguidores, juego más/menos completado
- [ ] Progreso del usuario en listas seguidas

### Logros

- [ ] Mostrar logros desbloqueados en perfil
- [ ] Notificación visual al desbloquear

### Resumen semestral

- [ ] Vista de resumen: juegos completados, género favorito, juego más rápido
- [ ] Compartible

### Social avanzado

- [ ] Comparación entre dos usuarios (juegos en común)
- [ ] Filtrar feed por tipo

### Dificultad comunitaria

- [ ] Votar dificultad al completar un juego
- [ ] Mostrar dificultad promedio en ficha

### Social cards

- [ ] Generar imagen compartible al completar un juego

---

## FASE 5 — Estabilización y Calidad

**Objetivo:** Mejorar UX basándose en feedback real.

### UX y performance

- [ ] Rediseño de UI/UX basado en feedback
- [ ] Paginación infinita o por cursor en listados largos
- [ ] Skeleton loaders y empty states en todas las vistas
- [ ] Mejoras en el buscador (highlight de matches, typo tolerance)

### Tests

- [ ] Tests de componentes principales (Vitest)
- [ ] Tests de services (HTTP mocking)
- [ ] Tests de guards e interceptors

### Exportar

- [ ] Descargar backlog/listas como CSV

---

## FASE 6 — Premium

**Objetivo:** Features premium con UX diferenciada.

### Estadísticas avanzadas

- [ ] Gráficos por género, plataforma
- [ ] Evolución del backlog por semestre
- [ ] Velocidad de completado, patrones de abandono
- [ ] Panel "Insights del Jugador"
- [ ] Resumen semestral/anual con gráficos (Wrapped)

### Personalización

- [ ] Temas visuales: retro, sepia, hacker, minimal (free: light + dark)
- [ ] Avatar personalizado (upload)
- [ ] Portada del perfil (banner)
- [ ] URL personalizada del perfil

### Listas colaborativas

- [ ] Invitar usuarios a listas compartidas (editor/viewer)

### Import CSV

- [ ] Pantalla de importación con preview y reporte de errores

### Sync Steam

- [ ] Vincular cuenta Steam
- [ ] Disparar sincronización manual
- [ ] Mostrar progreso de sync

### Suscripción

- [ ] Página "Completr Premium" con comparativa Free vs Premium
- [ ] Integración con Stripe checkout
- [ ] Estado de suscripción en perfil

---

## FASE 7 — Escalamiento Continuo

### Features futuras

- [ ] Mapa de calor de sesiones (estilo GitHub)
- [ ] Calendario de lanzamientos con recordatorios
- [ ] Presupuesto de tiempo mensual
- [ ] Play Along: playthroughs sincronizados con amigos
- [ ] App nativa (solo si PWA no es suficiente)
- [ ] i18n (internacionalización)

---

## Notas transversales

- **El backend calcula todo:** ratios, personal_ratio, estadísticas, datos derivados. El frontend solo renderiza lo que recibe.
- **Signals para estado:** signals para estado local (isLoading, datos cacheados), observables solo para HTTP y streams.
- **Lazy loading siempre:** cada feature se carga on-demand para mantener el bundle inicial pequeño.
- **Mobile-first:** diseñar pensando en PWA instalable en móvil. Desktop como extensión, no al revés.
- **Accesibilidad básica:** labels en formularios, contraste adecuado, navegación por teclado.
