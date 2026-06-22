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
| Fase 2.5 | Pulido y UX (feedback + visual)                       | `v0.3.x` |
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
- ~~Indicador visual cuando un item se auto-remueve al completar/abandonar~~ → movido a feedback (FB-066)

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

- [x] Vista `/profile` con datos del usuario (avatar, nombre, username, bio, rol, member since, privacy)
- [x] Editar perfil: modal con name, bio, avatar URL (con preview), isPublic, isWishlistPublic, isFavoritePublic
- [x] Privacy section: muestra estado de perfil, wishlist y favorites

### Deploy

- [ ] Deploy del frontend al VPS
- [ ] Configurar proxy/nginx para servir frontend + backend

### Hardening post-auditoría

- [x] Security headers en nginx (CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [x] Sidebar responsive con hamburger menu para móvil

---

## FASE 2 — MVP Amigos

**Objetivo:** Tus amigos pueden crear cuenta, ver tu perfil y backlog público.

> 5–20 amigos.

### Auth

- [x] Refresh token: AuthService guarda ambos tokens, errorInterceptor intenta refresh antes de logout
- [x] Logout llama `POST /auth/logout` para invalidar refresh token en backend

### Panel admin

- [x] Ruta `/admin/users` — formulario para crear usuarios (solo admin)
- [x] Ruta `/admin/games` — tabla de juegos con búsqueda, paginación, columna de reportes
- [x] Ruta `/admin/reports` — lista de reportes pendientes con approve/reject y filtro por juego
- [x] AdminGuard + sección Admin en sidebar (visible solo para admin)
- [x] AdminService con createUser, getPendingReports, updateReportStatus

### Mejoras UX

- [x] Backlog modal: botón "Add to Shelf" (solo en creación) para añadir el juego al game-shelf con la misma plataforma
- [x] Game Detail: action buttons (Backlog, Wishlist, Shelf) muestran estado activo cuando el juego ya está en la colección del usuario
- [x] Report issue: botón en game detail con modal, confirmación visual al enviar
- [x] Empty states descriptivos en: Backlog, Saved Views, Game Shelf, Wishlist, Favorites, Lists
- [x] Estilos globales reutilizables: modal-overlay, btn-submit, btn-ghost, empty-title, empty-hint

### Perfil público de otro usuario

- [x] Vista `/user/:username` (standalone, fuera del layout) con backlogs, game shelf, lists, following lists, favorites, wishlist, recent activity (máx 5-10 items + total count)
- [x] Contador de seguidores/siguiendo
- [x] Botón follow/unfollow (oculto en propio perfil)
- [x] Restaurar sesión al refrescar página de perfil público
- [x] Perfil privado muestra "This profile is private"

### Sistema social

- [x] Feed page como ruta default (/feed) con búsqueda global + activity feed
- [x] Activity feed: targets tipados (game → link, list → link, user → click), botón X para borrar propia actividad
- [x] Actividad propia mezclada con la de usuarios seguidos

### Listas públicas — funcionalidades sociales

- [x] Botón Follow/Unfollow en list-detail (solo no-owner)
- [x] Ocultar acciones de edición en listas de otros usuarios
- [x] Progreso personal en listas: barra de progreso (completed/total) en list-detail para todos los usuarios
- [x] En la página de Lists, sección "Following" con listas seguidas y barra de progreso mini

### Búsqueda

- [x] Búsqueda global en feed page (usuarios, juegos local-only, listas) con debounce y dropdown
- [x] Buscador de listas públicas en lists page
- [x] Games browse lee query param `q` del feed search

### Pendiente

- [x] Vistas completas de otro usuario: `/user/:username/backlog` (status tabs + paginación), `/favorites`, `/wishlist`, `/game-shelf` — todas con paginación de 50 items
- [x] Links "View All" clickeables en perfil público (backlog, game-shelf, favorites, wishlist)
- [x] Páginas 404 y 403
- [x] Permisos y roles: moderatorGuard, sidebar diferenciada por rol, admin-users reescrito con gestión completa, admin-audit nuevo, rutas actualizadas

---

## FASE 2.5 — Pulido y UX

**Objetivo:** Corregir bugs reportados por usuarios y mejorar la base visual del frontend antes de escalar.

> Mismos 5–20 usuarios, mejor experiencia.

### Migración a Angular Primitives (ng-primitives)

Migrar todo el frontend para que use ng-primitives como base de componentes UI. Ganamos accesibilidad (keyboard nav, ARIA), comportamiento robusto y una base sólida para las features que vienen.

- [x] Instalar ng-primitives (`^0.120.3`)
- [x] Migrar modals/dialogs a Dialog primitive (`UiDialog`)
- [x] Migrar tabs (backlog status tabs) a Tabs primitive (`UiTabs / UiTab / UiTabList / UiTabPanel`)
- [x] Migrar tooltips a Tooltip primitive (`UiTooltipContent`)
- [x] Migrar toggles/switches (isPublic, showInBacklog, etc.) a Switch primitive (`UiSwitch`)
- [x] Migrar botones a Button primitive (`UiButton`, `UiIconButton`)
- [x] Migrar checkboxes a Checkbox primitive (`UiCheckbox`)
- [x] Migrar inputs principales a Input primitive (`UiInput`) — quedan 3 archivos con `<input>` raw: `backlog-list`, `games-browse`, `game-filter-panel`
- [x] Migrar paginación a Pagination primitive (`UiPagination` sobre `NgpPagination`)
- [x] Migrar buscadores a Search primitive (`UiSearchBar` sobre `NgpSearch`)
- [ ] Migrar toasts/notificaciones a Toast primitive — requiere reescribir `ToastService` para usar `NgpToastManager.show(TemplateRef)` en vez del modelo signal array actual; conservar API pública (`success/error/pending/undo/dismiss`) y la lógica de undo timer
- [x] Migrar dropdowns/selects a Select primitive (`UiSelect` sobre `NgpNativeSelect` + estilos `.ui-input.ui-select` con chevron SVG): admin-users, admin-audit, admin-game-editor, backlog-modal (3), backlog-list (3), game-shelf-modal; list-modal usa Radio
- [x] Migrar barras de progreso (listas) a Progress primitive (`UiProgress` sobre `NgpProgress` — aplicado en `list-detail`, `list-overview`)
- [x] Migrar separadores visuales a Separator primitive (`UiSeparator` sobre `NgpSeparator` — sidebar)
- [x] Migrar avatares (perfil, sidebar, feed) a Avatar primitive (`UiAvatar` sobre `NgpAvatar` — sidebar, feed activities, feed follow requests; sweep restante en public-profile, user-list-modal, etc.)
- [x] Reemplazar los 3 `<input>` raw restantes por `UiInput size="sm"` (`backlog-list`, `games-browse`, `game-filter-panel`)
- [x] Migrar textareas y form fields a Textarea/Form Field primitives (`UiTextarea`, `UiFormField`, `UiLabel`, `UiDescription`, `UiError`); aplicado en `list-modal`, `settings-profile`, `game-detail`; sweep restante en backlog-modal, game-shelf-modal, admin-game-editor, backlog-list, saved-filters-view (estilos inline custom)
- [ ] Migrar menus (sidebar, context menu) a Menu/Navigation Menu primitives
- [x] Migrar radio buttons (score source, duration source) a Radio primitive (`UiRadioGroup`, `UiRadioItem` en `list-modal`)
- [x] Migrar star rating a a11y de tipo slider — el primitive `NgpSlider` no encaja por la UX de half/full click; se añadió `role="slider"`, `aria-valuemin/max/now/text` y navegación por teclado (←/→/Home/End/Del) al componente actual
- [ ] Migrar tablas (backlog, game-shelf, wishlist, admin) — no existe `NgpTable`; reemplazar con mejoras manuales de a11y (`aria-sort`, `scope`, keyboard nav en celdas ordenables)
- [ ] Sweep restante de `UiAvatar` por views de perfil público y modales (user-list, queue, wishlist, etc.)
- [ ] Verificar accesibilidad (keyboard nav, ARIA) en todos los componentes migrados

### Corrección de bugs por feedback de usuarios

- [ ] Revisar y corregir bugs reportados (ver docs/feedback/fase-2.md)

---

## FASE 3 — Beta Cerrada

**Objetivo:** Validar que la app genera interés fuera del círculo cercano. Sistema de invitación.

> 50–200 usuarios por invitación.

### Listas oficiales de Completr

- [x] Badge "Verified Official" en featured lists del game detail (hecho en Fase 2)
- [ ] Destacar listas oficiales en games-browse (sección "Completr Lists")
- [ ] Badge "Official" en list-detail y list-overview cards

### Privacidad

- [x] Respetar `isPublic` en todas las vistas de otros usuarios (hecho en Fase 2)
- [x] Toggle de visibilidad en perfil para wishlist y favoritos (modal de edición de perfil)

### Búsqueda avanzada

- [ ] Filtros combinados: género, plataforma, estado, ratio, duración

### Sistema de invitación

- [ ] Registro solo con código de invitación
- [ ] Generar y compartir invitaciones

### Badges

- [ ] Mostrar badges del usuario en su perfil
- [ ] Iconos/tooltips para cada tipo de badge

### Landing page

- [ ] Crear landing con descripción de Completr y formulario de solicitar invitación (Astro, separado)

### Revisión de paleta de colores

- [ ] Auditoría general de la paleta: definir jerarquía clara (brand para CTA y estado activo, accent secundario, muted para texto secundario, neutral default), revisar usos indiscriminados de `text-brand`, validar contraste WCAG AA en pares texto/fondo. Considerar variedad de color por sección en el sidebar (estilo Discord) — descartado en Fase 2 por preferencia, reevaluar con feedback de más usuarios. Relacionado con FB-089.

---

## FASE 4 — Beta Pública

**Objetivo:** Registro abierto. Validar retención y UX a escala.

> 500+ usuarios.

### Reviews

- [x] Reviews ya implementadas en Fase 2 (CRUD en game detail, campo en backlog modal, sección en perfiles)

### Notificaciones

- [ ] `NotificationsService` con signals para `unreadCount` y lista paginada
- [ ] Bell icon en sidebar/topbar con badge de no leídas (polling cada 30-60s o refresh on focus)
- [ ] Dropdown de notificaciones recientes (últimas 10) con link a vista completa
- [ ] Página `/notifications` con tabs All / Unread, paginación, marcar como leída al click, "Mark all as read"
- [ ] Render por tipo: `user_followed` (link al perfil), `list_followed` (link a lista), `coop_tagged` (link a juego), `friend_completed_list_game` (link a lista + juego), `achievement_unlocked` (link a logro)
- [ ] Eliminar notificación con botón X
- [ ] Sección de preferencias en perfil para activar/desactivar tipos
- [ ] (Opcional, Fase 5+) Web Push: pedir permiso, registrar suscripción, recibir push con la PWA cerrada

### Estadísticas de listas

- [x] Número de seguidores y progreso del usuario ya implementados en Fase 2
- [ ] Juego más/menos completado de la lista

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
- [ ] Backlog modal — selector de escala junto al input de Critic Score (`/5`, `/10`, `/100`) para que el usuario pueda ingresar una nota propia (ej. la que le dio un amigo) en la escala que más le acomode y la app la normalice al 0–5 con la misma lógica que los botones de fuente. Hoy se mitigó con `max="5"` + sufijo `/5` + placeholder explícito, suficiente mientras no aparezca en feedback. Si se prioriza: agregar signal `manualScoreScale` con default `5`, reusar `ScoreSourcesService.normalize` (o equivalente local) al cambiar la escala, mantener el valor escrito y solo reinterpretarlo

---

## Notas transversales

- **El backend calcula todo:** ratios, personal_ratio, estadísticas, datos derivados. El frontend solo renderiza lo que recibe.
- **Signals para estado:** signals para estado local (isLoading, datos cacheados), observables solo para HTTP y streams.
- **Lazy loading siempre:** cada feature se carga on-demand para mantener el bundle inicial pequeño.
- **Mobile-first:** diseñar pensando en PWA instalable en móvil. Desktop como extensión, no al revés.
- **Accesibilidad básica:** labels en formularios, contraste adecuado, navegación por teclado.
