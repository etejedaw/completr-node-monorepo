# Frontend

Arquitectura y convenciones de `apps/web`, la aplicación Angular que consume la API de `apps/api`. Las reglas generales de estilo, commits y post-edición están en [`conventions.md`](./conventions.md) y aplican a todas las apps.

## Stack

| Capa           | Tecnología                                                 |
| -------------- | ---------------------------------------------------------- |
| Framework      | Angular 22 (standalone, sin NgModule, zoneless)            |
| Lenguaje       | TypeScript 6.0                                             |
| Reactividad    | Signals                                                    |
| Formularios    | Signal Forms (`@angular/forms/signals`)                    |
| Estilos        | Tailwind CSS 4 + tokens por tema en `src/styles/themes/`   |
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

Dos páginas muestran contenido que no vive en este repo de Angular sino en la landing: What's new (`GET /changelog`) y Privacy (`GET /privacy`). La API hace de proxy con caché de 5 minutos y la página lo pide con `httpResource`, con esqueleto mientras carga y un estado de error con _Try again_. Al leer el recurso en la plantilla, comprueba `hasValue()` antes de `value()`: en estado de error `value()` lanza. Para cambiar esos textos no se toca `apps/web`; ver [`landing.md`](./landing.md).

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
├── styles/              # ui.css (wrappers de ng-primitives) y themes/<id>.css (tokens de cada tema)
├── styles.css           # Entrada de Tailwind, registro @theme y utilidades globales
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

### Temas y tokens

- Tema oscuro. Los tokens (`--color-*`, `--font-*`, `--radius-card`) se registran en `@theme` de Tailwind dentro de `src/styles.css`, y cada tema los redefine en su propio archivo `src/styles/themes/<id>.css` (bloque `:root[data-theme="<id>"]`, importado desde `styles.css`). Las clases usan siempre los tokens (`bg-surface`, `text-brand`), nunca hex sueltos.
- `ThemeService` (`core/services/theme.ts`) aplica el tema con `data-theme` en `<html>`, lo guarda en `localStorage` y en el usuario (campo `theme` de la API). El catálogo vive en `THEME_CATALOG` del frontend y en `apps/api/src/users/constants/theme.constants.ts`; un tema nuevo necesita su archivo en `src/styles/themes/`, su `@import` en `styles.css` y una entrada en ambos catálogos.
- Temas: `refined-dark` (por defecto, **Refined Dark**: grafito casi negro con violeta), `midnight-cyan` y `twilight-arcade`.
- Significado de los tokens de color:

| Token                              | Uso                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `brand`, `brand-hover`             | Acentos y texto de marca. Debe cumplir 4.5:1 sobre `canvas`, `surface` y `surface-hover` |
| `brand-solid`, `brand-solid-hover` | Superficies rellenas con texto blanco (botón primario, insignias). 4.5:1 con el blanco   |
| `brand-subtle`, `brand-glow`       | Fondos translúcidos y halos                                                              |
| `rating`                           | Estrellas y notas (igual a `brand`)                                                      |
| `playing`                          | Estado Playing; distinto de `brand` en cada tema                                         |
| `premium`                          | Dorado reservado a Premium: insignias, listones, contadores de tope y `toast.premium`    |
| `warning`                          | Naranja de advertencias. El amarillo no se usa fuera de Premium                          |
| `success`, `danger`, `info`        | Completado, destructivo/abandonado e información                                         |
| `nav-*`                            | Color de identidad de cada sección del menú                                              |

- Texto secundario y atenuado (`fg-secondary`, `fg-muted`) también cumplen 4.5:1 sobre los tres fondos. Al tocar un tema, recalcular los contrastes.

### Tipografía

- **Chakra Petch** (pesos 500, 600 y 700) para títulos y cifras destacadas (`font-display`) y **Manrope** (variable, 200 a 800) para el texto (`font-sans`).
- Servidas localmente desde `public/fonts/` (subconjuntos latin y latin-ext, `font-display: swap`), declaradas en `chakra-petch.css` y `manrope.css`. No se cargan fuentes de terceros. Ambas tienen licencia SIL Open Font License 1.1; su texto va junto a los archivos (`*-OFL.txt`) y debe acompañar a cualquier fuente que se agregue.
- Columnas de datos con `tabular-nums`.

### Shell

- `layout/` es el shell autenticado: barra lateral (o riel colapsado) y topbar con búsqueda global en escritorio; topbar, barra inferior de pestañas y hoja "More" en mobile. `guest-shell` es la versión para visitantes.
- El scroll vive en `main` (`.page-scroller`, contenedor de consultas `page`); cada página va dentro de `.page-shell`.

### Utilidades globales (`src/styles.css`)

| Utilidad                                  | Qué hace                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Variante `tap:`                           | Aplica en pantallas de menos de 640px **o** con puntero táctil. Se usa para tamaños táctiles (`tap:min-h-[44px]`) |
| `pointer-coarse:`                         | Solo para mostrar u ocultar según el puntero, nunca para tamaños                                                  |
| `.tap-area`                               | Amplía el área táctil a 44px con un `::after` invisible, sin cambiar el tamaño visual                             |
| `.bleed`, `.bleed-inner`, `.bleed-top`    | Llevan un bloque a todo el ancho del contenedor de página manteniendo el contenido alineado con el resto          |
| `.poster-grid`, `.poster-grid-actionable` | Grilla de portadas; la variante con acciones usa columnas más anchas en mobile                                    |
| `.bleed-scroll-snap`                      | Alinea el scroll horizontal de carruseles con el margen de la página                                              |

### Componentes compartidos

Antes de crear uno nuevo, reutilizar estos:

| Componente                                         | Dónde                                       | Para qué                                                                           |
| -------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `LibraryHero`                                      | `shared/components/library-hero`            | Encabezado de página con mosaico de portadas, título, subtítulo y acciones         |
| `LibraryToolbar`                                   | `shared/components/library-toolbar`         | Barra fija bajo la topbar con búsqueda y controles                                 |
| `CoverGrid`, `GameCoverCard`, `PosterShelf`        | `shared/components/`                        | Grillas y carruseles de portadas                                                   |
| `BacklogEntryCard`                                 | `shared/components/backlog-entry-card`      | Tarjeta del Diary (también en modo `readonly`)                                     |
| `BacklogTable`                                     | `features/backlog/components/backlog-table` | Tabla Hardcore de My Games y, en `readonly`, de la biblioteca pública              |
| `BacklogStatusPills`                               | `shared/components/backlog-status-pills`    | Filtro por estado en escritorio (`layout` `wrap` o `scroll`)                       |
| `ViewModeToggle`                                   | `shared/components/view-mode-toggle`        | Selector de vista (Diary / Hardcore / Calendar, Grid / Hardcore / Calendar)        |
| `OptionPicker`                                     | `shared/components/option-picker`           | Selector que abre menú en escritorio y hoja inferior en mobile                     |
| `MonthCalendar`                                    | `shared/components/month-calendar`          | Calendario mensual de cualquier vista con fechas                                   |
| `ProgressMeter`, `ListCard`, `ReviewCard`          | `shared/components/`                        | Progreso con etiqueta, tarjeta de lista y tarjeta de reseña                        |
| `UiDialog`, `UiBottomSheet`                        | `shared/ui/`                                | Diálogos: hoja inferior en mobile y modal centrado en escritorio                   |
| `UiEmptyState`, `UiNoMatches`, `UiPlainEmptyState` | `shared/ui/empty-state`                     | Estado vacío ilustrado, "sin resultados" con botón de limpiar y estado vacío plano |

### Patrones de interacción

- Mobile primero: toda acción se puede hacer con el dedo y nada depende solo del hover. En filas y tarjetas, escritorio muestra íconos y mobile un botón ⋮ de 44px que abre una hoja con las acciones.
- Reordenar siempre ofrece una alternativa al arrastre (flechas o "Move up/down"), y el arrastre solo empieza desde el asa.
- Las acciones destructivas reversibles usan `toast.pending` con _Undo_; las irreversibles piden confirmación.
- Los topes del plan free (HTTP 402) los avisa `errorInterceptor` con `toast.premium` y el texto de `core/utils/plan-limit-message.ts`.
