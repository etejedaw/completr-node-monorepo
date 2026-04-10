# Completr Frontend — Roadmap

> El frontend se desarrolla en paralelo con el backend. Cada fase corresponde a las mismas fases del backend. El backend calcula todo (ratios, estadísticas, datos derivados) — el frontend solo renderiza.

---

## Resumen cronológico

| Fase   | Etapa                                               | Release  |
| ------ | --------------------------------------------------- | -------- |
| Fase 0 | Setup y arquitectura base                            | `v0.1.0` |
| Fase 1 | Excel Killer (solo tú)                               | `v0.2.0` |
| Fase 2 | MVP Amigos (5–20 personas)                           | `v0.3.0` |
| Fase 3 | Beta Cerrada (50–200 usuarios, invitación)           | `v0.4.0` |
| Fase 4 | Beta Pública (500+ usuarios)                         | `v1.0.0` |
| Fase 5 | Estabilización y calidad                             | `v1.1.0` |
| Fase 6 | Premium                                              | `v2.0.0` |
| Fase 7 | Escalamiento continuo                                | `v2.x.x` |

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

- [ ] Pantalla de login (email + password)
- [ ] Pantalla de registro (username, email, password, name)
- [ ] Redirect automático post-login a `/backlog`
- [ ] Logout (limpiar token, redirect a login)

### Feature: Backlog (pantalla principal)

- [ ] Vista de tabla/lista del backlog con columnas: título, plataforma, ratio, duración, score, estado, userRating
- [ ] Ordenamiento por columna (ratio, score, duration, userRating, status)
- [ ] Filtros: status (not_started, playing, completed, abandoned), plataforma, rangos de fechas
- [ ] Multi-status filter (ej: completed + abandoned)
- [ ] Crear nueva entrada de backlog (seleccionar juego, plataforma, score, duration)
- [ ] Editar entrada (cambiar status, score, duration, userRating, notas)
- [ ] Eliminar entrada
- [ ] Indicador visual por status (colores o iconos)

### Feature: Game Shelf

- [ ] Vista de mi colección de juegos
- [ ] Agregar juego a la colección (con plataforma)
- [ ] Editar notas, edición, fecha de adquisición
- [ ] Quitar juego de la colección

### Feature: Búsqueda de juegos

- [ ] Barra de búsqueda con debounce (busca en backend, fallback a RAWG automático)
- [ ] Resultados con cover, título, plataformas, scores
- [ ] Desde el resultado: agregar a backlog, game-shelf, wishlist o favoritos

### Feature: Listas

- [ ] Vista "Mis listas" con listado
- [ ] Crear lista (nombre, descripción, pública/privada, fuente de score/duration)
- [ ] Detalle de lista con items ordenados, scores, ratios
- [ ] Agregar/quitar juegos de la lista (PUT replace-all)
- [ ] Reordenar juegos (drag & drop o flechas)
- [ ] Editar lista (nombre, descripción, visibilidad, fuente)
- [ ] Eliminar lista
- [ ] Refresh scores

### Feature: Wishlist

- [ ] Vista de mi wishlist ordenada por posición
- [ ] Agregar desde búsqueda de juegos (source=game, con selección de plataforma)
- [ ] Agregar desde backlog existente (source=backlog)
- [ ] Reordenar (PUT replace-all)
- [ ] Quitar items
- [ ] Indicador visual cuando un item se auto-remueve al completar/abandonar

### Feature: Favorites

- [ ] Vista de mis favoritos ordenada por posición
- [ ] Agregar/quitar juegos (PUT replace-all)
- [ ] Reordenar

### Feature: Saved Filters

- [ ] Guardar combinación actual de filtros del backlog como vista con nombre
- [ ] Listar mis filtros guardados
- [ ] Aplicar filtro guardado (carga los query params en el backlog)
- [ ] Editar y eliminar filtros guardados

### Feature: Perfil

- [ ] Vista `/profile` con datos del usuario (username, avatar, bio)
- [ ] Editar perfil (username, avatar_url)

### Navegación

- [ ] Sidebar o navbar con links a: Backlog, Game Shelf, Listas, Wishlist, Favoritos, Perfil
- [ ] Indicador de sección activa

---

## FASE 2 — MVP Amigos

**Objetivo:** Tus amigos pueden crear cuenta, ver tu perfil y backlog público.

> 5–20 amigos.

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
