# Frontend

Arquitectura y convenciones de `apps/web`, la aplicación Angular que consume la API de `apps/api`. Las reglas de código comunes a todo el repo están en [`../architecture.md`](../architecture.md#cómo-se-escribe-el-código) y el flujo de trabajo en [`conventions.md`](./conventions.md).

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

Las rutas `/share/*` (página de vista previa e imágenes del Rewind) se sirven bajo el dominio de la web, no el de la API. En producción el `location ^~ /share/` de `nginx.conf` hace proxy a la API; la URL interna sale de la variable de entorno `API_UPSTREAM` (con esquema, sin ruta; por defecto `https://api.completr.app`), que la imagen de nginx sustituye en la plantilla `/etc/nginx/templates/default.conf.template` al arrancar. En producción tiene que apuntar al contenedor interno de la API (`http://srv-captain--<app-de-la-api>:<puerto>`): con el valor por defecto el pedido vuelve a salir por Cloudflare, que reemplaza `cf-connecting-ip` por la IP del propio servidor, y todas las visitas a `/share/` comparten un solo cupo de rate limit. El proxy reenvía `X-Real-IP` tal como lo escribió el nginx de CapRover (`$http_x_real_ip`) en lugar de pisarlo, porque la API lo usa para decidir si confía en `cf-connecting-ip` (ver [Rate limiting](../invariants.md#rate-limiting)). En local `ng serve` usa `proxy.conf.json`, que manda `/share` a `http://localhost:3002`. `ngsw-config.json` excluye `/share/**` de `navigationUrls` para que el service worker no responda esos enlaces con el `index.html`.

Un service worker usa la CSP que venía con su script al instalarse, y el navegador solo lo reinstala si `ngsw-worker.js` cambia byte a byte. Angular genera ese archivo idéntico en cada build mientras no cambie su versión, así que un cambio en `security-headers.conf` no llegaría a los clientes que ya tienen el worker. Por eso el `postbuild` de `apps/web` corre `scripts/stamp-service-worker.mjs`, que agrega al final del worker `self.completrBuildFingerprint = "<hash>";`. El hash sale del worker, de `ngsw.json`, de `security-headers.conf` y de `nginx.conf`: cambia cuando cambia la app o los headers, y es estable si no cambia nada. `ngsw.json` no incluye el worker en su tabla de hashes, así que modificarlo después del build no rompe la verificación. Cuando el worker nuevo está listo, `app.ts` escucha `VERSION_READY` de `SwUpdate`, lo activa y recarga la página; revisa si hay actualización cada 5 minutos y cada vez que la ventana recupera el foco.

Al arrancar, `provideAppInitializer` intenta renovar el access token si está vencido, antes de resolver la primera ruta.

What's new (`GET /changelog`) y Privacy (`GET /privacy`) muestran contenido que vive en la landing y que la API reexpone (ver [`landing.md`](./landing.md)). Para cambiar esos textos no se toca `apps/web`.

## Estructura de carpetas

```
apps/web/src/
├── app/
│   ├── core/            # Singletons: services, interceptors, guards, models, utils
│   ├── shared/
│   │   ├── ui/          # Design system (button, input, select, tabs...)
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
- **`readonly`** en inputs, outputs y señales que no se reasignan; **`protected`** para lo que solo usa la plantilla.
- **Sin `ngClass` ni `ngStyle`**: se usan los bindings `[class]`, `[class.x]` y `[style.x]`. La única excepción es `layout.html`, que mantiene un `[ngClass]` junto a `routerLinkActive`.
- **Plantilla inline** en componentes chicos y `templateUrl` en los grandes. Una página que crece se parte en hijos dentro de `features/<feature>/components/` (por ejemplo, My Games tiene 8).
- **Imports solo de lo usado**, sin `CommonModule`. El build avisa con `NG8113` cuando sobra un import.
- **`httpResource`**: se lee con `hasValue()` antes de `value()`, porque `value()` lanza cuando el recurso está en error.
- **Espacios entre elementos inline**: Prettier junta los elementos inline y se come los espacios entre ellos. En una frase con enlaces intercalados se usa un separador explícito `{{ " " }}` (ver `feed-activity-item.html`).

```typescript
@Component({
	selector: "app-game-card",
	imports: [RouterLink],
	templateUrl: "./game-card.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameCard {
	readonly game = input.required<Game>();
	readonly gameClicked = output<Game>();
}
```

## Patrones clave

- **La lógica HTTP va en services.** Los componentes no inyectan `HttpClient`.
- **Componentes de página vs. componentes reutilizables.** Las páginas orquestan estado y HTTP; `shared/` solo recibe inputs y emite outputs.
- **Sin carpetas globales por tipo.** Fuera de `core/` y `shared/`, todo vive dentro de su feature.
- **Si falta un dato, se amplía la API.** El frontend no calcula derivados (ver [`../architecture.md`](../architecture.md#decisiones-clave)). Cuando un diseño necesita algo que el endpoint no envía (portadas, conteos, `role`), se agrega en la API con un cambio aditivo y se actualiza `docs/api/`. El frontend no lo arma con llamadas extra.
- **Lógica compartida con funciones `inject*`.** El comportamiento que repiten varias páginas (buscar juegos, agregar a My Games, seguir usuarios, scroll spy) va en una función `injectX()` dentro de la feature dueña. No se copia de página en página.

### Vista dueña y vistas que la reutilizan

Si una vista muestra lo mismo que otra, reutiliza los componentes de la vista dueña. No se crea un diseño paralelo. Primero se diseña la vista propia y después se lleva al perfil y a la página pública `/user/:u/...`. Los componentes reutilizables aceptan `readonly` para ocultar las acciones del dueño.

| Dato                      | Vista dueña                                 | Componentes                                                   | La reutilizan                                                                                                                                           |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entradas de la biblioteca | My Games (Diary y Hardcore)                 | `BacklogEntryCard`, `BacklogTable`, `BacklogStatusPills`      | Biblioteca pública (`user-backlog`), con `readonly`                                                                                                     |
| Colecciones de portadas   | My Shelf, Want to Get, Favorites            | `LibraryPage`, `CoverGrid`, `GameCoverCard`, `LibraryToolbar` | `ProfileCollectionPage` (`/user/:u/favorites`, `/wishlist`, `/game-shelf`)                                                                              |
| Up Next                   | `/queue`                                    | `QueueBrowser`, `QueueRow`, `QueueNextCard`                   | `/user/:u/queue` y el carrusel del perfil, con `readonly`                                                                                               |
| Listas                    | `/lists` y el detalle                       | `ListCard`, `ListItemRow`, `ProgressMeter`                    | Browse, la sección Lists del perfil y `/user/:u/lists` (`UserLists`, pestañas Created / Following con `?tab=following`)                                 |
| Sagas                     | `/franchises` (Discover)                    | `FranchiseCard`                                               | Ninguna por ahora; el detalle `/franchises/:code` usa `CoverGrid`                                                                                       |
| Reseñas                   | Reseñas del juego                           | `ReviewCard`, `RatingDistribution`                            | Sección Reviews del perfil y `/user/:u/reviews`                                                                                                         |
| Fechas en un mes          | Calendarios de My Games y My Shelf          | `MonthCalendar`                                               | Cualquier vista nueva con fechas                                                                                                                        |
| Encabezado de página      | Todas las páginas de biblioteca             | `LibraryHero`                                                 | Feed, Help, What's new, About, perfil público                                                                                                           |
| Selección masiva          | Hardcore de My Games, My Shelf y Platinums  | `injectRowSelection`, `BulkActionBar`, `SelectionCell`        | Ninguna: la biblioteca pública y toda tabla `readonly` o no `selectable` no muestran casillas                                                           |
| Rewind anual              | `/user/:u/rewind/:year` y `/user/:u/rewind` | `RewindYearCard`, `RewindShareActions`, `RewindTally`         | Perfil: `ProfileRewindSpotlight` (del 1 de diciembre al 31 de enero) y `ProfileRewinds` (fila compacta fuera de esa ventana), ambas con `access.rewind` |

## Tests

Los specs usan Vitest con jsdom a través de `@angular/build:unit-test`. Cada spec vive junto al archivo que prueba (`*.spec.ts`) y `describe`, `it`, `expect` y `vi` son globales.

- **Entorno común.** `src/test-environment.ts` (opción `setupFiles` del target `test` en `angular.json`) completa lo que jsdom no implementa y la app necesita: `Element.prototype.getAnimations`, que `ng-primitives` llama al cerrar toasts, diálogos y menús. Ningún spec lo define ni lo borra por su cuenta: un toast que se cierra después de que su spec terminó (su temporizador sigue vivo) caería en otro archivo y rompería la corrida según el orden en que se ejecuten.
- **Deterministas** (regla general en [`conventions.md`](./conventions.md#tests)). Un spec no depende de cuánto tarda la máquina: el reloj se fija con `vi.spyOn(performance, "now").mockReturnValue(...)` cuando el componente mide tiempo (el margen de apertura de `UiDialog` y `UiBottomSheet`), y para probar un debounce las teclas se disparan en el mismo turno (`fireEvent.input` en un bucle) en vez de confiar en que `user.type` sea más rápido que el debounce. Las esperas fijas solo sirven para comprobar que algo no ocurre.

### Patrones

- **Services HTTP**: `provideHttpClient()` + `provideHttpClientTesting()` y `HttpTestingController`. Cada test comprueba URL (con `environment.apiUrl`), método, params o body y el mapeo de la respuesta, y `afterEach` llama a `httpTesting.verify()`. Si el service arma los params con `buildHttpParams`, se busca la petición con `expectOne(req => req.url === ...)` y se inspeccionan los `params`.
- **Guards e interceptores funcionales**: los guards se ejecutan con `TestBed.runInInjectionContext` y un `AuthService` falso (`useValue`). Para el resultado se acepta `boolean`, `UrlTree` u `Observable` (`lastValueFrom`) y las redirecciones se comparan con `router.serializeUrl`. Los interceptores se prueban a través de `HttpClient` con `provideHttpClient(withInterceptors([...]))`.
- **Estado de módulo**: `errorInterceptor` guarda `isRefreshing` a nivel de módulo, así que todo test que dispare un 401 debe terminar el refresh (`next` + `complete`, o `error`) para no contaminar al siguiente.
- **Componentes**: `TestBed.createComponent`, inputs con `fixture.componentRef.setInput` y `fixture.detectChanges()` después de cada interacción (la app es zoneless). Se prueba lo que se renderiza y los outputs emitidos, no los métodos internos. Los componentes con `routerLink` necesitan `provideRouter([])`.
- **Dobles**: servicios con estado o efectos (`AuthService`, `ToastService`, `ViewportService`, `FavoritesService`) se reemplazan con `{ provide: X, useValue: {...} }` y `vi.fn()`. `StorageService` se prueba con el `localStorage` de jsdom, limpiándolo en `beforeEach`.
- **APIs que jsdom no trae** (`ResizeObserver`, `CSS.escape`): se stubean con `vi.stubGlobal` en `beforeEach` y se restauran con `vi.unstubAllGlobals()` en `afterEach`.
- El nombre del `it`, en inglés, describe el comportamiento.

### Tests de interacción

Los `<pantalla>.interaction.spec.ts` simulan lo que hace un usuario en una pantalla entera (login, My Games, Lists, ficha de juego, Up Next, Want to Get): hacen clic, escriben, abren diálogos y comprueban lo que se ve después de cada paso. Usan `@testing-library/angular` (`render`, `screen`, `within`, `waitFor`), `@testing-library/user-event` y los matchers de `@testing-library/jest-dom`, que cada spec activa con `import "@testing-library/jest-dom/vitest";` en la primera línea (no hay setup global).

- **Render**: `render(Pantalla, { providers, routes })` del entry principal de `@testing-library/angular`, que funciona con la app zoneless: tras cada evento de `user-event` y en cada `findBy*` / `waitFor` corre la detección de cambios de los fixtures montados. Si el recorrido cruza pantallas (crear una lista y aterrizar en su detalle, login y redirección), se renderiza un host con `<router-outlet />` y las rutas reales, con `initialRoute`.
- **Consultas**: por rol y nombre accesible (`getByRole("button", { name: "Move Celeste up" })`, `getByRole("dialog", { name: "Edit run" })`, `getByLabelText("Notes")`), acotadas con `within(...)` cuando el mismo control se repite por fila o tarjeta. Las pantallas renderizan a la vez la versión de escritorio y la de mobile (jsdom no aplica Tailwind), así que un control puede aparecer dos veces: se acota al contenedor (`within(screen.getByRole("navigation", { name: "Filter by status" }))`) o se toma el primero. El input de `ui-search-bar` toma su nombre accesible de `ariaLabel` (por defecto, el placeholder sin los puntos suspensivos finales): se busca con `getByRole("textbox", { name })`. Los botones de acción de `app-game-cover-card` incluyen el título del juego en su nombre ("Remove Hades from Want to Get"); el overlay de escritorio y la barra táctil se alternan con `display: none`, así que solo uno llega a la tecnología de asistencia (jsdom muestra ambos). La tarjeta de `app-backlog-entry-card` se nombra con título y estado ("Hollow Knight, Not Started") y el resto de su contenido la describe con `aria-describedby`.
- **API simulada con estado**: `provideHttpClient()` + `provideHttpClientTesting()` y una función `answer(req)` que responde cada petición como la API (lista, filtra por `status` o `search`, aplica `PATCH`, `PUT` y `DELETE` sobre un arreglo local) y lanza `Unexpected request` para cualquier URL que no conozca. `answerPending()` responde en rondas todo lo pendiente (`httpTesting.match(() => true)`), porque una respuesta dispara otras peticiones. `untilVisible(assertion)` envuelve `waitFor` y responde lo pendiente en cada intento: cubre los `debounceTime` de las búsquedas sin fake timers. `afterEach` responde lo que quede y llama a `httpTesting.verify()`.
- **Aserciones sobre la API**: además de lo visible, cada recorrido comprueba el body que llegó al servidor simulado (los `PATCH`, el orden que manda `PUT /items` o `PUT /queue`, los `DELETE`), guardado en arreglos que se vacían en `beforeEach`.
- **Sesión**: para que la pantalla sepa quién es el dueño (`isOwner`, `isLoggedIn`) se usa el `AuthService` real y se llama a `loadUser()` después del render; el `GET /users/me` lo responde la API simulada.
- **Diálogos**: `DialogService` (ng-primitives) los monta en `document.body`; se buscan con `screen.findByRole("dialog", { name })`. Cuando se cierran desaparecen del DOM.
- **Popovers y menús**: el contenido de un overlay de ng-primitives se renderiza de forma reactiva, así que los atributos que ponen sus primitivos (`aria-multiselectable`, `aria-activedescendant`) aparecen un ciclo después de abrirlo. Tras abrirlo, `await fixture.whenStable()` antes de leer esos atributos o de navegar con el teclado.
- **Toasts con Undo**: se monta `<app-toast-container />` en el host y se registra el fixture como componente raíz con `TestBed.inject(ApplicationRef).components.push(fixture.componentRef)`, porque `NgpToastManager` busca el `ViewContainerRef` en `applicationRef.components[0]`. El Undo se prueba con el botón _Undo_ y el commit con _Dismiss_, sin esperar los 5 segundos de `UNDO_WINDOW_MS`.
- **`@defer (on viewport)`**: en jsdom el disparador de viewport de Angular no llega a observar el placeholder aunque se stubee `IntersectionObserver`, así que un recorrido no puede depender de que un bloque diferido se renderice. Lo que el recorrido necesita ver se carga con `appInView` (que sí usa el stub) o se prueba en el spec del componente (`rewind.interaction.spec.ts` deja diferidas solo las portadas por mes y "More Rewinds").
- **Reordenar**: el drag & drop de CDK no se simula; se usan los botones "Move up/down" y "Move to top", que son la alternativa accesible que exige la app.
- **APIs que jsdom no trae** en estos recorridos: `matchMedia` (`PointerService`, `ViewportService`) e `IntersectionObserver` se stubean con `vi.stubGlobal`; `Element.prototype.getAnimations` (salida de los toasts) se define en `beforeEach` como `() => []` y se borra con `Reflect.deleteProperty` en `afterEach`.

## Nombres

- Archivos en `kebab-case`. Componentes y el service principal de una feature sin sufijo (`game-card.ts`, `backlog.ts`); guards e interceptors con sufijo (`auth.guard.ts`, `auth.interceptor.ts`). Cuando una feature tiene varios services, van en `services/` con sufijo `.service.ts`.
- Clases, interfaces y tipos en `PascalCase` (`GameCard`, `BacklogEntry`).
- Los tipos compartidos entre features (el contrato con la API) viven en `core/models/`. El resto de las `interface` y de los `type` que describen un objeto (también una unión de objetos) van en un `<archivo>.model.ts` junto al archivo que los usa (`rewind-tally.ts` → `rewind-tally.model.ts`, `audit.service.ts` → `audit.model.ts`), nunca dentro de un componente, service, guard, directiva o util; las uniones de literales que esos tipos necesitan viajan con ellos. Se quedan donde están los tipos derivados de una constante o función (`(typeof X)[number]`, `ReturnType<typeof injectX>`), las firmas de función y los tipos locales de un spec.
- Selectores con prefijo `app-` o `ui-` (lo valida ESLint). Los componentes de `shared/ui/` que extienden un elemento nativo usan selector de atributo (`<button uiButton>`).
- URLs en `kebab-case` (`/game-shelf`, `/saved-views`).

## Diseño visual

### Temas y tokens

- Tema oscuro. Los tokens (`--color-*`, `--font-*`, `--radius-card`) se registran en `@theme` de Tailwind dentro de `src/styles.css`, y cada tema los redefine en su propio archivo `src/styles/themes/<id>.css` (bloque `:root[data-theme="<id>"]`, importado desde `styles.css`). Las clases usan siempre los tokens (`bg-surface`, `text-brand`), nunca hex sueltos.
- `ThemeService` (`core/services/theme.ts`) aplica el tema con `data-theme` en `<html>`, lo guarda en `localStorage` y en el usuario (campo `theme` de la API). El catálogo vive en `THEME_CATALOG` del frontend y en `apps/api/src/users/constants/theme.constants.ts`; un tema nuevo necesita su archivo en `src/styles/themes/`, su `@import` en `styles.css` y una entrada en ambos catálogos.
- Temas: `refined-dark` (por defecto, **Refined Dark**: grafito casi negro con violeta), `midnight-cyan` y `twilight-arcade`.
- Significado de los tokens de color:

| Token                              | Uso                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brand`, `brand-hover`             | Acentos y texto de marca. Debe cumplir 4.5:1 sobre `canvas`, `surface` y `surface-hover`                                                                                     |
| `brand-solid`, `brand-solid-hover` | Superficies rellenas con texto blanco (botón primario, insignias). 4.5:1 con el blanco                                                                                       |
| `brand-subtle`, `brand-glow`       | Fondos translúcidos y halos                                                                                                                                                  |
| `rating`                           | Estrellas y notas (igual a `brand`)                                                                                                                                          |
| `playing`                          | Estado Playing; distinto de `brand` en cada tema                                                                                                                             |
| `premium`                          | Dorado reservado a Premium: insignias, listones, contadores de tope y `toast.premium`                                                                                        |
| `admin`                            | Platino reservado al rol Admin: insignia de rol (`bg-admin-metal text-admin`), anillo y halo del avatar del admin, y sección Admin del menú; no se usa en ninguna otra parte |
| `platinum`                         | Trofeo de platino de un juego (`PlatinumTrophy` y título de la ficha); cian hielo distinto de `admin`, `premium`, `playing` y `brand` en cada tema                           |
| `warning`                          | Naranja de advertencias. El amarillo no se usa fuera de Premium                                                                                                              |
| `success`, `danger`, `info`        | Completado, destructivo/abandonado e información                                                                                                                             |
| `nav-*`                            | Color de identidad de cada sección del menú; `nav-admin` apunta a `admin`                                                                                                    |

- Texto secundario y atenuado (`fg-secondary`, `fg-muted`) también cumplen 4.5:1 sobre los tres fondos, y en cada tema la jerarquía `fg` > `fg-secondary` > `fg-muted` debe seguir siendo visible. Al tocar un tema, recalcular los contrastes.
- Sombras y `drop-shadow` son tokens (`--shadow-*`, `--drop-shadow-*` en `@theme`). Son negras con alfa y no varían por tema, así que los archivos de `styles/themes/` no las redefinen. Una sombra escrita con `shadow-[...]` que se usa en más de un sitio pasa a token.
- Superficies y bordes: `canvas`, `sidebar`, `surface`, `surface-hover`, `input-bg`, `line` y `line-hover`. Un hover sobre una fila usa `hover:bg-surface-hover`. Nunca se usa blanco o negro con alfa (`bg-white/[0.03]`), porque no se adapta a los temas.
- La raíz mide **14px** (`html { font-size: 14px }`), así que las clases en rem de Tailwind salen un 12,5% más chicas: `h-11` mide 38,5px y `gap-2` mide 7px. Los tamaños mínimos (44px táctiles, separaciones de 8px) se escriben en px: `min-h-[44px]`, `gap-[8px]`.

### Tipografía

- **Chakra Petch** (pesos 500, 600 y 700) para títulos y cifras destacadas (`font-display`) y **Manrope** (variable, 200 a 800) para el texto (`font-sans`).
- Servidas localmente desde `public/fonts/` (subconjuntos latin y latin-ext, `font-display: swap`), declaradas en `chakra-petch.css` y `manrope.css`. No se cargan fuentes de terceros. Ambas tienen licencia SIL Open Font License 1.1; su texto va junto a los archivos (`*-OFL.txt`) y debe acompañar a cualquier fuente que se agregue.
- Columnas de datos con `tabular-nums`.

### Shell

- `layout/` es el shell autenticado: barra lateral (o riel colapsado) y topbar con búsqueda global en escritorio; topbar, barra inferior de pestañas y hoja "More" en mobile. `guest-shell` es la versión para visitantes.
- El scroll vive en `main` (`.page-scroller`, contenedor de consultas `page`); cada página va dentro de `.page-shell`. No se pone `isolate` en `<main>`, porque rompe el apilamiento de las hojas inferiores.
- Medidas del shell como variables CSS en `styles.css`: `--topbar-height`, `--tabbar-height`, `--page-max-width`, `--page-pad-x`, `--page-pad-y` y `--page-pad-top`. Las barras fijas se pegan con `top-[var(--topbar-height)]`.
- Escritorio: barra lateral que se colapsa a riel (siempre riel en tablet) y búsqueda global inline con el atajo `/`. Mobile: barra inferior de 5 pestañas y búsqueda en overlay (`MobileSearchOverlay`).
- Toda la configuración de los toasts vive en `TOAST_CONFIG` (`core/services/toast.ts`) y hay un solo `ToastContainer`, montado en `layout`. `ng-primitives/toast` se carga con `import()` dinámico para sacarlo del bundle inicial, así que no hay `provideToastConfig` en `app.config.ts`.

### Utilidades globales (`src/styles.css`)

| Utilidad                                  | Qué hace                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Variante `tap:`                           | Aplica en pantallas de menos de 640px **o** con puntero táctil. Se usa para tamaños táctiles (`tap:min-h-[44px]`) |
| `pointer-coarse:`                         | Solo para mostrar u ocultar según el puntero, nunca para tamaños                                                  |
| `.tap-area`                               | Amplía el área táctil a 44px con un `::after` invisible, sin cambiar el tamaño visual                             |
| `.bleed`, `.bleed-inner`, `.bleed-top`    | Llevan un bloque a todo el ancho del contenedor de página manteniendo el contenido alineado con el resto          |
| `.poster-grid`, `.poster-grid-actionable` | Grilla de portadas; la variante con acciones usa columnas más anchas en mobile                                    |
| `.bleed-scroll-snap`                      | Alinea el scroll horizontal de carruseles con el margen de la página                                              |

- `.tap-area` dentro de un contenedor con `overflow-x-auto` necesita padding vertical táctil en el contenedor (`pointer-coarse:py-[8px]`) para que el área no se recorte. Tampoco se usa en enlaces de líneas contiguas, porque las áreas invisibles se solapan: ahí cada enlace lleva `tap:min-h-[44px]` (ver `AttributionFooter`).
- El design system (`styles/ui.css`) ya da 44px bajo 768px o con puntero táctil a `.ui-button`, `.ui-icon-button`, `.ui-tab` y al interruptor; `.ui-input` mide 44px en todos los anchos salvo `size="sm"`. Los elementos propios usan `tap:` o `.tap-area`.
- `styles/ui.css` no está en una capa de cascada, así que sus reglas ganan a las utilidades de Tailwind: para cambiar `display`, tamaño, borde o fondo de un `uiButton` / `uiIconButton` hace falta `!` (`sm:!hidden`). Un color propio del texto de un botón `link` va en un `<span data-link-label>` hijo.

### Componentes compartidos

Antes de crear uno nuevo, se reutiliza uno de estos. Sus inputs están en el código; acá va para qué sirve cada uno y la regla de uso cuando la hay.

| Componente                                                                                                        | Dónde                                                            | Para qué                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UiDialog`, `UiBottomSheet`, `UiDrawer`                                                                           | `shared/ui/`                                                     | `UiDialog` es **el único diálogo** de la app (hoja inferior en mobile, modal en escritorio); no se usan `ngpDialog` ni overlays propios. `UiDrawer` es el cajón lateral de escritorio. Los tres comparten los tonos de `shared/ui/tone/ui-tone.ts` |
| `uiButton`, `uiIconButton`                                                                                        | `shared/ui/button`, `shared/ui/icon-button`                      | Botones. Se usa una variante (`glass` sobre un héroe, `link` dentro de una frase, `premium` solo en acciones premium) en vez de pisar estilos con clases                                                                                           |
| `UiBadge`, `UiCountBadge`, `BacklogStatusBadge`                                                                   | `shared/ui/badge`, `shared/ui/count-badge`, `shared/components/` | Insignias de estado, rol y contadores. No se arman pastillas a mano                                                                                                                                                                                |
| `ChipGroup` / `button[appFilterChip]`                                                                             | `shared/components/chip-group`                                   | Chips de filtro; también los usan `PlatformFilter` y `BacklogStatusPills`. No se arman pastillas de filtro a mano                                                                                                                                  |
| `OptionPicker`                                                                                                    | `shared/components/option-picker`                                | Elegir una opción: menú en escritorio, hoja inferior en mobile                                                                                                                                                                                     |
| `BacklogStatusPicker`                                                                                             | `shared/components/backlog-status-picker`                        | Cambiar el estado de una entrada del backlog. Maneja su propio apilamiento: las vistas no le ponen `z-*`                                                                                                                                           |
| `ActionMenu`                                                                                                      | `shared/components/action-menu`                                  | Agrupa acciones (menú en escritorio, hoja en mobile), también el ⋮ por fila. Un ítem de navegación usa `link`, no `router.navigate` en `selected`                                                                                                  |
| `UiSearchBar`, `app-page-search`                                                                                  | `shared/ui/search-bar`, `shared/components/page-search`          | Búsqueda. Las vistas no le cambian alto ni tipografía, solo layout. Ver "Búsqueda contextual"                                                                                                                                                      |
| `UiFiltersButton`, `FilterSection`, `RangeInputs`                                                                 | `shared/ui/button`, `shared/components/`                         | Botón Filters de las barras, grupo de un panel de filtros y par mínimo / máximo                                                                                                                                                                    |
| `UiTable`, `SelectionCell`, `BulkActionBar`                                                                       | `shared/ui/table`, `shared/directives/`, `shared/components/`    | Tablas (Admin, Hardcore, My Shelf, Platinums), selección por casilla y barra de acciones masivas. No se pisan las cabeceras con `!`                                                                                                                |
| `UiDatePicker`, `UiFieldLabel`, `UiFieldError`                                                                    | `shared/ui/`                                                     | Fechas, etiquetas y errores de formulario. Ver "Fechas y errores de campo"                                                                                                                                                                         |
| `UiAlert`                                                                                                         | `shared/ui/alert`                                                | Aviso en línea. Para confirmaciones con botones se usa un diálogo                                                                                                                                                                                  |
| `UiEyebrow`                                                                                                       | `shared/ui/label`                                                | Títulos de sección y etiquetas que no son de un campo                                                                                                                                                                                              |
| `UiEmptyState`, `UiNoMatches`, `UiPlainEmptyState`                                                                | `shared/ui/empty-state`                                          | Estado vacío ilustrado, "sin resultados" y vacío plano                                                                                                                                                                                             |
| `UiCheckbox`, `SegmentedControl`, `ViewModeToggle`                                                                | `shared/ui/checkbox`, `shared/components/`                       | Casilla, control segmentado y selector de vista                                                                                                                                                                                                    |
| `UiAvatar`, `UiPremiumBadge`, `AppLogo`                                                                           | `shared/ui/`, `shared/components/app-logo`                       | Avatar con anillo según el premium efectivo, listón Premium y marca                                                                                                                                                                                |
| `ui-skeleton`                                                                                                     | `shared/ui/`                                                     | Esqueleto de carga; el tamaño se da en el host (`class="h-16 w-24 rounded-md"`)                                                                                                                                                                    |
| `LibraryHero`, `LibraryToolbar`, `LibraryPage`                                                                    | `shared/components/`                                             | Encabezado, barra fija y cuerpo de las páginas de biblioteca y colección                                                                                                                                                                           |
| `GamePoster`                                                                                                      | `shared/components/game-poster`                                  | Portada 2:3 con fallback generativo. Se usa siempre en vez de un `<img>` de portada                                                                                                                                                                |
| `CoverGrid`, `GameCoverCard`, `PosterShelf`                                                                       | `shared/components/`                                             | Grillas y carruseles de portadas                                                                                                                                                                                                                   |
| `BacklogEntryCard`, `BacklogTable`, `BacklogStatusPills`                                                          | `shared/components/`, `features/backlog/components/`             | Tarjeta del Diary, tabla Hardcore y filtro por estado                                                                                                                                                                                              |
| `QueueBrowser`                                                                                                    | `features/queue/queue-browser`                                   | Cuerpo de Up Next, propio y público                                                                                                                                                                                                                |
| `MonthCalendar`                                                                                                   | `shared/components/month-calendar`                               | Calendario mensual de cualquier vista con fechas                                                                                                                                                                                                   |
| `RatioSummary`, `StarRating`, `RatingDistribution`                                                                | `shared/components/`                                             | Ratio estimado frente al personal (el componente para mostrarlo), estrellas y distribución de notas                                                                                                                                                |
| `ProgressMeter`, `ListCard`, `ReviewCard`, `FranchiseCard`                                                        | `shared/components/`, `features/`                                | Progreso, tarjetas de lista, reseña y saga                                                                                                                                                                                                         |
| `GameSearchStep`, `SelectedGameRow`                                                                               | `shared/components/game-search`                                  | Paso de búsqueda del catálogo dentro de un diálogo                                                                                                                                                                                                 |
| `PlatformFilter`                                                                                                  | `shared/components/platform-filter`                              | Pastillas de plataforma con contador (My Shelf, Want to Get)                                                                                                                                                                                       |
| `ExpandableText`                                                                                                  | `shared/components/expandable-text`                              | Texto con "Read more" que solo aparece si el texto se corta                                                                                                                                                                                        |
| `UnfollowConfirmDialog`, `DialogDeleteAction`, `ActivityDeleteButton`                                             | `shared/components/`                                             | Confirmar "Unfollow", borrar desde el pie de un diálogo de edición y borrar una actividad propia                                                                                                                                                   |
| `ExportActions`                                                                                                   | `shared/components/export-actions`                               | Botón "Export" (CSV / JSON) de una colección propia; descarga lo mismo que muestra la vista                                                                                                                                                        |
| `GiftOfferCard`                                                                                                   | `shared/components/gift-offer-card`                              | Canje de un regalo premium dentro de la sección de su feature                                                                                                                                                                                      |
| `ProfileBackdrop`, `ProfileCollectionPage`                                                                        | `shared/components/`, `features/public-profile/components`       | Fondo del hero del perfil y página de colección pública                                                                                                                                                                                            |
| `PageToc`, `InfoPageLinks`, `AttributionFooter`                                                                   | `shared/components/`                                             | Índice de páginas largas, pie de páginas informativas y pie de atribución                                                                                                                                                                          |
| `ErrorPage`                                                                                                       | `features/error-pages`                                           | Base de `/403`, `/404` y la ruta comodín                                                                                                                                                                                                           |
| `StatsCard`, `CompletionsChart`, `StatusBreakdown`                                                                | `features/backlog/components/`                                   | Stats de una vista guardada                                                                                                                                                                                                                        |
| `RewindYearCard`, `RewindShareActions`, `RewindTally`, `RewindPersonaRank`, `RewindAiRecap`, `RewindPremiumStats` | `features/rewind/components/`                                    | Piezas del Rewind anual                                                                                                                                                                                                                            |

Helpers y directivas que también se reutilizan:

| Pieza                                     | Dónde                                                         | Para qué                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `injectRowSelection`                      | `shared/utils/row-selection.ts`                               | Selección de filas de una tabla; se reinicia sola cuando cambian los ids de las filas                   |
| `injectBulkRunner`, `injectBulkRemoval`   | `shared/utils/bulk-runner.ts`, `bulk-removal.ts`              | Ejecutar un lote masivo y el borrado masivo con Undo                                                    |
| `injectBodyPortal()`                      | `shared/ui/portal/body-portal.ts`                             | Mueve un overlay a `body` (un `fixed` dentro de una barra con `backdrop-blur` queda anclado a la barra) |
| `injectGameSearch()`                      | `features/games/game-search.ts`                               | Búsqueda del catálogo con debounce, local y luego en línea                                              |
| `injectBacklogQuickAdd()`                 | `features/backlog/backlog-quick-add.ts`                       | Agregar a My Games o editar la entrada si ya existe, desde cualquier grilla                             |
| `injectFollowActions()`                   | `features/users-discover/follow-actions.ts`                   | Follow / Unfollow con confirmación                                                                      |
| `injectFranchiseTracking()`               | `features/franchises/franchise-tracking.ts`                   | Track / Tracking de una saga                                                                            |
| `injectLibraryPosters()`                  | `features/backlog/library-posters.ts`                         | Portadas recientes para el `LibraryHero` de páginas que no cargan juegos                                |
| `injectExportDownload()`, `ExportService` | `shared/components/export-actions`, `core/services/export.ts` | Descargas de archivos (ver "Patrones de interacción")                                                   |
| `ViewportService`, `PointerService`       | `core/services/`                                              | `isMobile` (menos de 768px) e `isCoarse` como señales                                                   |
| `appInView`, `appSwipeActions`            | `shared/directives/`                                          | Intersección con el viewport; deslizar en mobile                                                        |
| `password-policy.ts`                      | `core/utils/`                                                 | Requisitos de contraseña con la política real de la API                                                 |

### Patrones de composición

- **Encabezado de página**: `LibraryHero` es el único dueño de la separación entre su contenido y la línea inferior. Las vistas no ponen `mb-*` ni `pb-*` en `[heroSubtitle]`, `[heroActions]` ni en el contenido proyectado, y el contenedor de acciones se oculta vacío (`empty:hidden`). Si el contenido proyectado necesita padding táctil por estar en un `overflow-x-auto`, se compensa con un margen negativo igual (ver `user-backlog.html`).
- **Hero de detalle** (juego, perfil): ocupa todo el ancho con `bleed bleed-top`. Lleva una imagen difuminada y otra nítida con máscara, un degradado hacia `canvas`, el contenido alineado abajo en `bleed-inner` y `fetchpriority="high"` en la imagen principal. Lo de más abajo usa `loading="lazy"`.
- **Eyebrow + título**: un eyebrow en mayúsculas con `tracking` amplio y color de marca, y debajo el título en `font-display font-bold tracking-tight`. El eyebrow de marca es `uiEyebrow tone="brand"` (`tone="premium"` en Premium), nunca clases escritas a mano. Las etiquetas de formulario usan `uiFieldLabel` (texto normal) y los títulos de sección dentro de formularios o listas, `uiEyebrow` con el tono por defecto.
- **Barra de herramientas fija**: `LibraryToolbar` (`sticky` bajo la topbar, fondo `canvas` translúcido con `backdrop-blur`).
- **Hero o barra**: el lugar de un control lo decide si cambia datos o solo la vista. En `[heroActions]` van las acciones que crean o cambian datos (Add game, Create list, Track saga, New view, Reorder, Surprise me): como máximo una primaria y una secundaria, y el resto en un `ActionMenu` `⋯` (`placement="hero"`, `iconOnly`), como el detalle de una lista propia. Si varias acciones del mismo tipo compiten por ser la primaria, van juntas en un `ActionMenu` con `variant="primary"` (Run job en Admin → Jobs). Refresh solo recarga la vista: va al final de la barra si la vista tiene una y, si no, como botón de ícono en el hero (Admin → Jobs, Promotions y Reports), para no crear una barra vacía. El "Add game" de admin en Browse va arriba de la barra, junto al título o bajo el carrusel. La ficha de un juego sigue la misma regla en `GameLibraryActions`: la acción primaria es My Games (o la última run), la secundaria Favorite, y Up Next, Want to Get, My Shelf y Lists van en un `ActionMenu` "More library actions" (`size="lg"`) cuyos ítems muestran dónde ya está el juego ("In Up Next", "On My Shelf", "In 2 lists") con el color de la sección (`iconClass`). En Feed, el selector "Show" va en `LibraryToolbar`, alineado con el ancho del feed. Debajo del título van las pestañas de alcance (estados, plataformas, Created / Following). En la barra va lo que solo cambia cómo se ve la lista, siempre en este orden: búsqueda → vista guardada → filtros → orden → modo de vista → Export. Un control queda en la misma zona en escritorio y en mobile; en mobile se adapta (fila completa, hoja inferior), no se muda.
- **Listas minimalistas** (Feed, Up Next, actividad): filas con `divide-y divide-line`, miniatura de portada, una frase con los nombres resaltados y la hora a la derecha. Sin tarjetas.
- **Estados completos**: el esqueleto tiene la forma real del contenido (nunca "Loading..."). El vacío lleva ícono, título, texto y una acción útil. El error y el privado explican qué pasó y ofrecen una salida.
- **Carruseles con rotación**: se pausan con hover o foco, tienen botón de pausa, no rotan con `prefers-reduced-motion` y usan `aria-live="off"` mientras rotan.
- **Datos con color**: nunca solo color; siempre etiqueta y número.
- **Navegación con enlaces reales** (`routerLink`), no botones con `router.navigate`. Los botones quedan para acciones.

### Búsqueda contextual

- **Una sola barra.** En el shell autenticado no conviven dos buscadores: la barra superior es a la vez la búsqueda global y el filtro de la página. Una página que filtra su lista monta `app-page-search` (con `scopeLabel`, el nombre de la sección tal como lo ve el usuario) en vez de `ui-search-bar`; la página sigue siendo dueña de su estado (señal, debounce, query params) y el componente solo reenvía.
- `Layout` provee `PageSearchScope` (no es `root`): hay un alcance a la vez y gana el último registrado. Fuera del `Layout` (visitante, specs con `TestBed`) `app-page-search` dibuja el `ui-search-bar` de siempre.
- **Cuándo no.** Los buscadores dentro de un diálogo, una hoja o un paso de "agregar" no filtran la página: usan `ui-search-bar`. Las páginas sin lista que filtrar (Feed, ficha de un juego) no montan `app-page-search`.

### Fechas y errores de campo

- **Fechas.** Se eligen con `UiDatePicker`, nunca con `<input type="date">` ni `type="datetime-local"`: el nativo muestra el formato y el calendario del sistema según el idioma y no sigue el tema. Los límites se llaman `minDate` / `maxDate` porque Angular no deja enlazar `min` / `max` junto a `[formField]` (NG8022). Un par From / To pasa cada extremo como límite del otro, así nunca queda From > To.
- La etiqueta de un `UiDatePicker` va afuera con `<label uiFieldLabel [for]>` apuntando a `triggerId`, sin `uiFormField` ni `uiLabel`, que reescriben el `for` hacia un control de ng-primitives.
- **Errores de campo.** Todo error bajo un campo es `UiFieldError`, enlazado por `aria-describedby`, con `aria-invalid` en el campo. No tiene rol por defecto para que el lector no lo anuncie dos veces; `announce` le pone `role="alert"` cuando el error llega con el foco en otro lado. Los errores de una acción que no pertenecen a un campo van como texto con `role="alert"`.
- **Specs.** Para elegir una fecha como un usuario se usa `pickCalendarDate` (`shared/ui/date-picker/ui-date-picker.testing.ts`). Un mensaje de error se busca con `selector: "ui-field-error span"`, porque el texto va en un `span` junto al ícono.

### Patrones de interacción

- **Mobile primero:** toda acción se puede hacer con el dedo y nada depende solo del hover. En filas y tarjetas, escritorio muestra íconos (32px, 44px con `tap:`) y mobile un `ActionMenu` `iconOnly` `variant="ghost"` que abre la hoja con las acciones con texto.
- Mostrar u ocultar según **tamaño de pantalla y puntero a la vez** (`max-sm:` y `pointer-coarse:`), nunca solo por puntero: un navegador angosto con mouse tiene que funcionar igual que un celular.
- En mobile se **adapta** el formato de la vista, no se reemplaza por otro: una grilla de portadas sigue siendo grilla. Si el diseño de escritorio ya funciona, se conserva y solo se adapta mobile.
- Las opciones de un menú aparecen debajo del disparador o en la hoja, nunca sobre el contenido. Orden de apilamiento: `UiBottomSheet` en `z-[1000]` (una hoja abierta desde otra queda encima) y el menú de `OptionPicker` en `z-[1010]`.
- Reordenar siempre ofrece una alternativa al arrastre (flechas o "Move up/down"), y el arrastre solo empieza desde el asa (`cdkDragHandle`).
- **Selección masiva** solo en las tablas Hardcore propias (My Games, My Shelf, Platinums), solo con la casilla: el clic en la fila sigue abriendo el editor. Los predicados de elegibilidad son funciones puras compartidas con la tabla y la tarjeta del Diary (`shared/utils/backlog-eligibility.ts`), no se reescriben por página.
- **Acciones destructivas:** las reversibles (quitar de una colección) usan `toast.pending` con _Undo_, con una ventana de 5 segundos para toda la app (`UNDO_WINDOW_MS`) que no se configura por pantalla. Las irreversibles y dejar de seguir a alguien piden confirmación con un `UiDialog` `tone="danger"`, nunca con una confirmación en línea.
- **Errores que avisa el interceptor:** los 402 (topes del plan free, con `toast.premium`) y los 409, 422 y 429 los muestra `errorInterceptor`. Las pantallas no repiten ese toast: lo consultan con `isToastedByErrorInterceptor(status)`. `toast.premium` se llama solo desde el interceptor y desde `UiPremiumBadge`.
- **Errores de formulario del admin:** un error del servidor se oculta en cuanto el usuario cambia el valor que lo produjo, comparando contra una foto de los valores enviados, y reaparece si vuelve a ese valor.
- **Descargas:** todo archivo se baja con `ExportService` (`core/services/export.ts`), que pide el formato por el header `Accept`, toma el nombre de `Content-Disposition` y descarga con un `<a download>` temporal. Un `Blob` que ya está en memoria usa `ExportService.saveFile`.
- **Premium en la UI:** el dorado (`premium`) marca el premium completo efectivo, venga del rol o de una concesión temporal; el admin conserva el platino. Anillos e insignias salen de `avatarRing` y `elevatedRoleBadge` (`core/utils/`). Una vista que depende de una feature consulta `AuthService.hasPremiumFeature(feature)`, no `isPremium`, para que un regalo de esa feature la desbloquee.
- **Regalos premium:** se canjean con `GiftOfferCard` dentro de la sección de la feature, nunca en un modal. Angular no decide elegibilidad ni duración: lo dice la API (`GET /users/me/gift-offers`).
- **Rewind:** es la única página bilingüe de la app. Se muestra en `rewind.language` para todos los que la ven; los textos viven en `REWIND_COPY`, tipado como `Record<RewindLanguage, RewindCopy>` para que una clave que falte en un idioma no compile, y fechas y números salen de `Intl`. Tiene su paleta propia con tokens existentes (`rewind-tone.ts`); el dorado se reserva al marco de las secciones premium. Todo su movimiento se apaga con `prefers-reduced-motion` y nada queda en bucle.

### Proceso de diseño y verificación

- Cada decisión de UI, por chica que sea, se respalda con las guías de UX de `.claude/skills/ui-ux-pro-max` (`python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<tema>" --domain ux`) y con la documentación actual de Angular, Tailwind y ng-primitives, no con lo que uno recuerda.
- Un cambio visual se verifica en tres casos: escritorio con mouse (1440×900), navegador angosto con mouse (390px) y celular táctil emulado (390×844). En cada uno se revisa que no haya objetivos táctiles de menos de 44px, desbordamiento horizontal ni errores de consola.
- Si una vista pública reutiliza la propia, el cambio en un componente compartido llega solo a las dos, pero la estructura de página puede seguir duplicada: al cambiar una, se revisan ambas.
- El login de la API tiene rate limit estricto (`authLimiter` en `apps/api/src/common/config/rate-limiter.config.ts`): los scripts de prueba inician sesión una sola vez y recorren los viewports en la misma sesión.
