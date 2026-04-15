# Completr Frontend — Contexto del Proyecto

## Visión

Frontend de Completr (Backlogr): aplicación web para gestionar backlogs de videojuegos con ratios de priorización, listas curadas y features sociales. Se conecta al backend Node.js/Express ya implementado.

---

## Stack técnico

| Capa                | Tecnología                            |
| ------------------- | ------------------------------------- |
| Framework           | Angular 21 (standalone, sin NgModule) |
| Lenguaje            | TypeScript 5.9                        |
| Reactividad         | Signals (Angular Signals API)         |
| Testing             | Vitest + jsdom                        |
| Estilos             | CSS (sin preprocesador por ahora)     |
| PWA                 | `@angular/pwa` (pendiente)            |
| Build               | `@angular/build:application`          |
| Package Manager     | npm                                   |

---

## Conexión con el backend

| Config      | Valor                                |
| ----------- | ------------------------------------ |
| Base URL    | `http://localhost:3000` (desarrollo) |
| Auth        | JWT Bearer token en header           |
| Token store | `localStorage`                       |

---

## Arquitectura

### Estructura de carpetas (feature-based)

Angular moderno recomienda organización por feature, no por tipo. Cada feature agrupa sus componentes, services, guards y routes:

```
src/
├── app/
│   ├── core/                    # Servicios singleton, interceptors, guards globales
│   │   ├── services/            # AuthService, ApiService, StorageService
│   │   ├── interceptors/        # auth.interceptor.ts, error.interceptor.ts
│   │   ├── guards/              # auth.guard.ts
│   │   └── models/              # Interfaces compartidas (User, Game, etc.)
│   ├── shared/                  # Componentes reutilizables, pipes, directivas
│   │   ├── components/          # LoadingSpinner, GameCard, RatioDisplay, etc.
│   │   └── pipes/               # ratio.pipe.ts, truncate.pipe.ts
│   ├── features/                # Módulos de funcionalidad (lazy loaded)
│   │   ├── auth/                # Login, registro
│   │   ├── backlog/             # Vista principal del backlog, filtros, tabla
│   │   ├── game-shelf/          # Mi colección de juegos
│   │   ├── games/               # Búsqueda, detalle de juego
│   │   ├── lists/               # CRUD de listas, detalle con items
│   │   ├── wishlist/            # Mi wishlist
│   │   ├── favorites/           # Mis favoritos
│   │   ├── profile/             # Perfil propio y público
│   │   └── saved-filters/       # Gestión de filtros guardados
│   ├── app.ts                   # Componente raíz
│   ├── app.config.ts            # Providers globales
│   └── app.routes.ts            # Rutas principales (lazy loading)
├── environments/                # Variables de entorno (apiUrl, etc.)
├── styles.css                   # Estilos globales
├── index.html
└── main.ts
```

### Estructura interna de una feature

Cada feature sigue la misma convención:

```
features/backlog/
├── backlog.routes.ts            # Rutas de la feature (lazy loaded)
├── backlog-list/                # Componente: vista de lista/tabla
│   ├── backlog-list.ts
│   ├── backlog-list.html
│   └── backlog-list.css
├── backlog-filters/             # Componente: panel de filtros
│   ├── backlog-filters.ts
│   ├── backlog-filters.html
│   └── backlog-filters.css
└── backlog.service.ts           # Service de la feature (HTTP calls)
```

---

## Convenciones Angular moderno (v17+)

### Standalone components (sin NgModule)

Todos los componentes son standalone. Cada uno declara sus imports directamente:

```typescript
@Component({
  selector: 'app-game-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './game-card.html',
  styleUrl: './game-card.css'
})
export class GameCard {
  game = input.required<Game>();
}
```

### Signals para estado reactivo

Angular Signals reemplazan la mayoría de usos de BehaviorSubject/Observable para estado local y compartido:

```typescript
// Estado local en componentes
protected readonly isLoading = signal(false);
protected readonly games = signal<Game[]>([]);

// Valores derivados (computed)
protected readonly totalGames = computed(() => this.games().length);

// En services (estado compartido)
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
}
```

**Cuándo usar Signals vs Observables:**
- **Signals**: estado sincrónico, UI state, datos cacheados, computed values
- **Observables (RxJS)**: llamadas HTTP, WebSockets, eventos de tiempo (debounce, throttle), operaciones complejas con operadores

### Inyección de dependencias con `inject()`

Usar `inject()` en vez de constructor injection:

```typescript
export class BacklogService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
}
```

### Signal inputs y outputs

Inputs y outputs modernos basados en signals:

```typescript
@Component({ ... })
export class GameCard {
  // Input requerido
  game = input.required<Game>();

  // Input con default
  showRatio = input(true);

  // Output
  gameClicked = output<Game>();
}
```

### Change Detection con OnPush

Todos los componentes usan `OnPush` para mejor performance. Con signals esto es natural porque Angular detecta automáticamente cuándo un signal cambia:

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  ...
})
```

### HTTP Client con providers

Configurado en `app.config.ts` con interceptors funcionales:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))
  ]
};
```

### Interceptor funcional (no clase):

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};
```

### Lazy loading por feature

Las rutas cargan features on-demand:

```typescript
export const routes: Routes = [
  {
    path: 'backlog',
    loadChildren: () => import('./features/backlog/backlog.routes')
      .then(m => m.BACKLOG_ROUTES)
  }
];
```

### Reactive Forms

Se usan Reactive Forms (no template-driven) para formularios complejos:

```typescript
export class LoginForm {
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });
}
```

### Guards funcionales

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};
```

---

## Patrones clave

- **Feature-based structure**: cada feature tiene sus componentes, service y routes. No hay carpetas globales `components/` o `services/` (salvo `core/` y `shared/`).
- **Smart vs Dumb components**: los componentes de página (smart) manejan lógica y HTTP. Los componentes reutilizables (dumb) solo reciben inputs y emiten outputs.
- **El backend calcula todo**: ratios, estadísticas y datos derivados vienen del backend. El frontend solo renderiza.
- **Toda la lógica HTTP en services**: los componentes nunca llaman a `HttpClient` directamente.
- **Estado con Signals**: signals para estado local y compartido, observables solo para HTTP y streams.

---

## Versionado por fase (mismo que backend)

| Fase     | Release  | Descripción                                    |
| -------- | -------- | ---------------------------------------------- |
| Fase 0   | `v0.1.0` | Setup, arquitectura, sin vistas funcionales    |
| Fase 1   | `v0.2.0` | Excel Killer, solo uso personal                |
| Fase 1.5 | `v0.2.x` | Beyond the Spreadsheet, mejoras + deploy       |
| Fase 2   | `v0.3.0` | MVP Amigos, 5–20 personas                      |
| Fase 3   | `v0.4.0` | Beta cerrada, 50–200 por invitación            |
| Fase 4   | `v1.0.0` | Beta pública, primer release abierto (500+)    |
| Fase 5   | `v1.1.0` | Estabilización y calidad                       |
| Fase 6   | `v2.0.0` | Premium                                        |
| Fase 7   | `v2.x.x` | Incrementales según features                   |

---

## Convenciones de código

### Naming

- Componentes: `kebab-case` para archivos (`game-card.ts`), `PascalCase` para clase (`GameCard`)
- Services: `kebab-case` para archivos (`backlog.service.ts`), `PascalCase` para clase (`BacklogService`)
- Interfaces/types: `PascalCase` (`Game`, `BacklogEntry`, `User`)
- Routes: `kebab-case` en URLs (`/game-shelf`, `/saved-filters`)

### Commits

- Conventional Commits (igual que backend): `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Solo una línea, sin cuerpo ni firma

### Post-edición

- Después de terminar ediciones: ejecutar lint y format

---

### Post-edición

- Después de terminar ediciones: ejecutar `npm run lint:fix` y `npm run format`

---

## Diseño visual

- Tema oscuro inspirado en Discord pero con identidad propia
- Paleta: fondos oscuros azulados, acento sky blue (#0ea5e9), status con colores semánticos
- CSS variables globales en `styles.css` (--bg-primary, --bg-sidebar, --accent, --status-*, etc.)
- Sidebar con secciones agrupadas (Library, Collections), brand icon, avatar de usuario
- Auth pages con gradiente sutil de fondo y card con sombra profunda
- Tablas con hover, sort arrows, status badges redondeados

---

## Estado actual

### Completado (Fase 0)

- Proyecto Angular 21 generado con CLI, standalone components
- Estructura feature-based: `core/`, `shared/`, `features/`, `environments/`
- Environments con `apiUrl` para dev y producción, `fileReplacements` en angular.json
- `AuthService` con signals, `StorageService` para token en localStorage
- Interceptors funcionales: `authInterceptor` (Bearer token), `errorInterceptor` (401 → logout)
- Guards funcionales: `authGuard`, `guestGuard`
- `provideHttpClient` con `withInterceptors` en app.config.ts
- Lazy loading en todas las rutas con componentes placeholder
- Layout con sidebar (secciones agrupadas, brand icon, avatar, sign out)
- 11 interfaces/modelos TypeScript (Game, BacklogEntry, List, etc.)
- PWA con service worker, manifest e iconos
- ESLint + Prettier configurados (misma config que backend)
- Vitest como test runner

### Completado (Fase 1 — Excel Killer v0.2.0)

- Login funcional con reactive forms y redirect (registro bloqueado, solo admin)
- Backlog: tabla con todas las columnas (backgroundUrl, title, platform, score, duration, ratio, realDuration, personalRatio, userRating, finishedAt, status, notes)
- CRUD de backlog: crear (modal con búsqueda de juego + debounce), editar (click en fila), eliminar (con confirmación)
- Búsqueda de juegos en modal con fallback a RAWG + botón "Force search" dentro del dropdown
- Precarga automática de score (Metacritic → OpenCritic → RAWG → Completr) y duration (HLTB → RAWG → Completr) al seleccionar juego
- Selector de plataformas filtrado por plataformas del juego seleccionado
- Sort: title, ratio y personalRatio se ordenan en frontend; el resto via backend
- Filtros por status con tabs (sin flicker al cambiar)
- Búsqueda local por título en la tabla del backlog
- Status badges con colores semánticos
- Notas visibles como texto inline (max 2 líneas truncadas)
- Nullable en update: startedAt, finishedAt, realDuration, userRating, notes se pueden limpiar
- Design system con CSS variables, dark theme, gradientes sutiles
- `backgroundUrl` en vez de `coverUrl` en todas las interfaces y templates
- `personalRatio` agregado al serializer del backend
- Star rating component (0.5-5, half stars, gamer labels: Unplayable→GOAT) en modal y tabla
- Score source buttons: todas las fuentes disponibles como botones, normalización a escala Completr (0.5-5)
- Duration source buttons: misma UX que scores
- Searching indicator en buscador de juegos
- Required asterisks en campos obligatorios del modal de creación
- Fechas DATEONLY (sin timezone, sin desfase)

### Completado (Fase 1.5 — Beyond the Spreadsheet, en progreso)

- Game Shelf: tabla con CRUD modal, búsqueda local, título clickeable a ficha del juego
- Games Browse: secciones Latest Added, género random, Completr Lists placeholder, Top Rated. Grid de carátulas
- Game Detail: banner, tags, stats (Completr ratio/score/duration + Scores + Durations), descripción, similar games por género
- Favorite toggle en banner, action buttons (Add to Backlog/Shelf con modal, Wishlist con platform picker)
- Modals con `preselectedGame` para bloquear campo game desde ficha del juego
- Community placeholder, Featured in Lists placeholder
- FavoritesService con toggle y replaceFavorites (PUT replace-all)
- Paginación en GET /games (limit/offset/sort_by/genre)
- Game code en serializers de backlog, game-shelf, wishlist y favorites para links
- Wishlist: vista tabla con score/duration/ratio, add-from-backlog modal, corazón en backlog tabla y modal
- Favorites: vista grid de carátulas con remove al hover
- Ratio en wishlist serializer del backend
- Listas: overview con grid de cards, create/edit modal (isPublic default true), detalle con items CRUD, buscador, reorder, refresh scores, frozen banner, delete con redirect
- Ícono backlog binario en listas (gris clickeable → abre backlog modal, cyan → ya está)
- Material Icons en sidebar, backlog, game detail, listas
- Game code en list-items serializer

### Fase 1.5 completada

- Saved filters: showInBacklog, isDefault, descripción, chips en backlog, página `/saved-views` con modal de edición
- Perfil: vista con avatar, nombre, rol, bio, privacy; modal de edición
- Normalización de scores a escala Completr (botón en modal)
- Filtros avanzados del backlog: multi-status, plataforma, fechas, rating con estrellas, sort
- Admin game editor: RAWG fetch, create/edit mode, DLC parent game
- Hardening post-auditoría: security headers en nginx (CSP, HSTS, X-Frame-Options, etc.)
- Sidebar responsive con hamburger menu para móvil

### Fase 2 (en progreso)

- Backlog modal: botón "Add to Shelf" (solo en creación) que añade el juego al game-shelf con la misma plataforma seleccionada
- Game Detail: action buttons (Backlog, Wishlist, Shelf) muestran estado activo (cyan) cuando el juego ya está en cada colección del usuario
- Refresh token: AuthService guarda access_token + refresh_token, errorInterceptor intenta refresh antes de logout, logout invalida token en backend
- Admin panel: `/admin/users` (crear usuarios), `/admin/games` (tabla con búsqueda y reportes), `/admin/reports` (approve/reject con filtro por juego)
- AdminGuard + sección Admin en sidebar solo para admin
- Report issue: botón en game detail con modal y confirmación visual
- Empty states descriptivos en todas las vistas principales
- Estilos globales reutilizables: modal-overlay, btn-submit, btn-ghost, empty states
- CSS budget aumentado a 12kB por componente
- Feed page como ruta default (/feed): búsqueda global (usuarios, juegos local-only, listas) + activity feed con targets
- Perfil público: /user/:username (fuera del layout, standalone). Secciones: backlog, game shelf, lists (con followerCount), following lists, favorites, wishlist, recent activity. Follow/unfollow, restaura sesión al refrescar
- List detail: ownership check (oculta edición en listas ajenas), botón Follow/Unfollow
- Lists page: buscador de listas públicas
- Games browse: lee query param `q` del feed search
- Activity feed: targets tipados (game/list/user), botón X para borrar actividad propia
- Vistas completas de otro usuario: /user/:username/backlog (status tabs, búsqueda local, paginación 50), /favorites (grid, paginación), /wishlist (tabla, paginación), /game-shelf (tabla, búsqueda local, paginación). Todas standalone con top bar y back link
- Links "View All" clickeables en el perfil público (backlog, game-shelf, favorites, wishlist → navegan a las vistas completas)
- PublicProfileService: métodos paginados para todas las colecciones + nuevo getUserFollowingLists
