# Frontend

Arquitectura y convenciones de `apps/web`, la aplicación Angular que consume la API de `apps/api`. Las reglas generales de estilo, commits y post-edición están en [`conventions.md`](./conventions.md) y aplican a todas las apps.

## Stack

| Capa           | Tecnología                                                 |
| -------------- | ---------------------------------------------------------- |
| Framework      | Angular 22 (standalone, sin NgModule, zoneless)            |
| Lenguaje       | TypeScript 6.0                                             |
| Reactividad    | Signals                                                    |
| Formularios    | Signal Forms (`@angular/forms/signals`)                    |
| Estilos        | Tailwind CSS 4 + CSS por tema (`src/styles/themes/`)       |
| Componentes UI | Design system propio en `shared/ui/` sobre `ng-primitives` |
| Iconos         | Material Icons                                             |
| PWA            | `@angular/service-worker` (`ngsw-config.json`)             |
| Testing        | Vitest + jsdom (`@angular/build:unit-test`)                |
| Build          | `@angular/build:application`                               |

## Conexión con el backend

| Config      | Valor                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| Base URL    | `apiUrl` en `src/environments/` (`http://localhost:3000` en desarrollo)       |
| Auth        | JWT Bearer en header (`authInterceptor`) + refresh token (`errorInterceptor`) |
| Token store | `localStorage` (`core/services/storage.ts`)                                   |

Al arrancar, `provideAppInitializer` intenta renovar el access token si está vencido, antes de resolver la primera ruta.

## Estructura de carpetas

```
apps/web/src/
├── app/
│   ├── core/            # Singletons: services, interceptors, guards, models, utils
│   ├── shared/
│   │   ├── ui/          # Design system (button, input, select, tabs, tooltip...)
│   │   ├── components/  # Componentes de dominio reutilizables (game-cover-card, star-rating...)
│   │   ├── directives/
│   │   ├── pipes/
│   │   ├── constants/
│   │   └── utils/
│   ├── layout/          # Shell autenticado y guest-shell
│   ├── features/        # Una carpeta por feature, cargada con lazy loading
│   ├── app.ts
│   ├── app.config.ts    # Providers globales
│   └── app.routes.ts    # Todas las rutas
├── environments/
├── styles/              # ui.css activo + themes/
├── styles.css           # Entrada de Tailwind y tokens del tema activo
├── index.html
└── main.ts
```

Cada feature agrupa sus componentes y su service:

```
features/backlog/
├── backlog.ts               # Service de la feature (HTTP)
├── backlog-list/
│   ├── backlog-list.ts
│   └── backlog-list.html
├── backlog-modal/
└── backlog-calendar/
```

## Convenciones Angular

- **Standalone components.** Cada componente declara sus `imports`.
- **Signals para el estado.** `signal` y `computed` para estado local y compartido; RxJS solo para HTTP y streams (debounce, polling).
- **`inject()`** en vez de inyección por constructor.
- **Signal inputs y outputs** (`input()`, `input.required()`, `output()`).
- **`ChangeDetectionStrategy.OnPush`** en los componentes.
- **Interceptors y guards funcionales** (`HttpInterceptorFn`, `CanActivateFn`), no clases.
- **Lazy loading** con `loadComponent` en `app.routes.ts` y `PreloadAllModules`.
- **Signal Forms** para formularios.

```typescript
@Component({
	selector: "app-game-card",
	imports: [RouterLink],
	templateUrl: "./game-card.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameCard {
	game = input.required<Game>();
	gameClicked = output<Game>();
}
```

## Patrones clave

- **El backend calcula todo.** Ratios, estadísticas y derivados vienen de la API; el frontend solo renderiza.
- **La lógica HTTP va en services.** Los componentes no inyectan `HttpClient`.
- **Componentes de página vs. componentes reutilizables.** Las páginas orquestan estado y HTTP; `shared/` solo recibe inputs y emite outputs.
- **Sin carpetas globales por tipo.** Fuera de `core/` y `shared/`, todo vive dentro de su feature.

## Nombres

- Archivos en `kebab-case`. Componentes y el service principal de una feature sin sufijo (`game-card.ts`, `backlog.ts`); guards e interceptors con sufijo (`auth.guard.ts`, `auth.interceptor.ts`). Cuando una feature tiene varios services, van en `services/` con sufijo `.service.ts`.
- Clases, interfaces y tipos en `PascalCase` (`GameCard`, `BacklogEntry`).
- Selectores con prefijo `app-` o `ui-` (lo valida ESLint). Los componentes de `shared/ui/` que extienden un elemento nativo usan selector de atributo (`<button uiButton>`).
- URLs en `kebab-case` (`/game-shelf`, `/saved-views`).

## Diseño visual

- Tema oscuro. Los tokens (`--color-*`, fuentes) viven en `src/styles.css` dentro de `@theme` de Tailwind.
- Temas disponibles en `src/styles/themes/`; cómo cambiar de tema está en su [`README.md`](../../apps/web/src/styles/themes/README.md).
- Tipografía Space Grotesk, servida localmente desde `public/fonts/`.
