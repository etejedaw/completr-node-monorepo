# Frontend

Estándares del frontend Angular: estructura, convenciones de código, tests y diseño visual. Están escritos para servir tal cual en cualquier proyecto con el mismo stack (Angular standalone, zoneless y signals + Tailwind CSS 4 + ng-primitives + Vitest). Lo que es propio de un producto concreto vive en el documento de reglas del repo.

## Estructura de carpetas

```
src/
├── app/
│   ├── core/            # Singletons: services, interceptors, guards, models, utils
│   ├── shared/
│   │   ├── ui/          # Design system (button, input, select, tabs...)
│   │   ├── components/  # Componentes de dominio reutilizables
│   │   ├── directives/
│   │   ├── pipes/
│   │   ├── constants/
│   │   └── utils/
│   ├── layout/          # Shell autenticado y shell de visitantes
│   ├── features/        # Una carpeta por feature, cargada con lazy loading
│   ├── app.ts
│   ├── app.config.ts    # Providers globales
│   └── app.routes.ts    # Todas las rutas
├── environments/
├── styles/              # Wrappers de ng-primitives y un archivo de tokens por tema
├── styles.css           # Entrada de Tailwind, registro @theme y utilidades globales
├── index.html
└── main.ts
```

Cada feature agrupa sus componentes y su service:

```
features/<feature>/
├── <feature>.ts             # Service de la feature (HTTP)
├── <feature>-list/
│   ├── <feature>-list.ts
│   └── <feature>-list.html
└── <feature>-modal/
```

## Convenciones Angular

- **Standalone components.** Cada componente declara sus `imports`.
- **Zoneless.** La app no usa zone.js: lo que cambia la vista vive en signals, y en los tests se llama a `fixture.detectChanges()` después de cada interacción.
- **Signals para el estado.** `signal` y `computed` para estado local y compartido; RxJS solo para HTTP y streams (debounce, polling).
- **`inject()`** en vez de inyección por constructor.
- **Signal inputs y outputs** (`input()`, `input.required()`, `output()`).
- **`ChangeDetectionStrategy.OnPush`** en los componentes.
- **Interceptors y guards funcionales** (`HttpInterceptorFn`, `CanActivateFn`), no clases.
- **Lazy loading** con `loadComponent` en `app.routes.ts` y `PreloadAllModules`.
- **Signal Forms** para formularios.
- **`readonly`** en inputs, outputs y señales que no se reasignan; **`protected`** para lo que solo usa la plantilla.
- **Sin `ngClass` ni `ngStyle`**: se usan los bindings `[class]`, `[class.x]` y `[style.x]`.
- **Plantilla inline** en componentes chicos y `templateUrl` en los grandes. Una página que crece se parte en hijos dentro de `features/<feature>/components/`.
- **Imports solo de lo usado**, sin `CommonModule`. El build avisa con `NG8113` cuando sobra un import.
- **`httpResource`**: se lee con `hasValue()` antes de `value()`, porque `value()` lanza cuando el recurso está en error.
- **Espacios entre elementos inline**: Prettier junta los elementos inline y se come los espacios entre ellos. En una frase con enlaces intercalados se usa un separador explícito `{{ " " }}`.
- **Al arrancar, `provideAppInitializer`** renueva el access token vencido antes de resolver la primera ruta.

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
- **El frontend no calcula derivados.** Si un diseño necesita un dato que el endpoint no envía, se amplía la API con un cambio aditivo; el frontend no lo arma con llamadas extra.
- **Lógica compartida con funciones `inject*`.** El comportamiento que repiten varias páginas (buscar, agregar a una colección, seguir usuarios, scroll spy) va en una función `injectX()` dentro de la feature dueña. No se copia de página en página.
- **Una vista que muestra lo mismo que otra reutiliza los componentes de la vista dueña.** No se crea un diseño paralelo. Primero se diseña la vista propia y después la pública; los componentes reutilizables aceptan `readonly` para ocultar las acciones del dueño.
- **Un componente compartido es el único dueño de lo que encapsula.** El diálogo del design system es el único diálogo de la app (no se usan `ngpDialog` ni overlays propios), y botones, insignias, chips, tablas, estados vacíos y avisos se usan en vez de armarlos a mano. Si falta una variante, se agrega al componente.

## Tests

Los specs usan Vitest con jsdom a través de `@angular/build:unit-test`. Cada spec vive junto al archivo que prueba (`*.spec.ts`) y `describe`, `it`, `expect` y `vi` son globales.

- **Entorno común.** Un `test-environment.ts` (opción `setupFiles` del target `test` en `angular.json`) completa lo que jsdom no implementa y la app necesita: `Element.prototype.getAnimations`, que `ng-primitives` llama al cerrar toasts, diálogos y menús. Ningún spec lo define ni lo borra por su cuenta: un toast que se cierra después de que su spec terminó (su temporizador sigue vivo) caería en otro archivo y rompería la corrida según el orden en que se ejecuten.
- **Deterministas.** Un spec no depende de cuánto tarda la máquina: el reloj se fija con `vi.spyOn(performance, "now").mockReturnValue(...)` cuando el componente mide tiempo, y para probar un debounce las teclas se disparan en el mismo turno (`fireEvent.input` en un bucle) en vez de confiar en que `user.type` sea más rápido que el debounce. Las esperas fijas solo sirven para comprobar que algo no ocurre.
- El nombre del `it`, en inglés, describe el comportamiento.

### Patrones

- **Services HTTP**: `provideHttpClient()` + `provideHttpClientTesting()` y `HttpTestingController`. Cada test comprueba URL, método, params o body y el mapeo de la respuesta, y `afterEach` llama a `httpTesting.verify()`. Si el service arma los params con un helper, se busca la petición con `expectOne(req => req.url === ...)` y se inspeccionan los `params`.
- **Guards e interceptores funcionales**: los guards se ejecutan con `TestBed.runInInjectionContext` y un servicio de autenticación falso (`useValue`). Para el resultado se acepta `boolean`, `UrlTree` u `Observable` (`lastValueFrom`) y las redirecciones se comparan con `router.serializeUrl`. Los interceptores se prueban a través de `HttpClient` con `provideHttpClient(withInterceptors([...]))`.
- **Estado de módulo**: un interceptor que guarda estado a nivel de módulo (por ejemplo un flag de refresh en curso) obliga a que todo test que lo dispare lo termine (`next` + `complete`, o `error`) para no contaminar al siguiente.
- **Componentes**: `TestBed.createComponent`, inputs con `fixture.componentRef.setInput` y `fixture.detectChanges()` después de cada interacción (la app es zoneless). Se prueba lo que se renderiza y los outputs emitidos, no los métodos internos. Los componentes con `routerLink` necesitan `provideRouter([])`.
- **Dobles**: los servicios con estado o efectos (sesión, toasts, viewport) se reemplazan con `{ provide: X, useValue: {...} }` y `vi.fn()`. El service de almacenamiento se prueba con el `localStorage` de jsdom, limpiándolo en `beforeEach`.
- **APIs que jsdom no trae** (`ResizeObserver`, `CSS.escape`, `matchMedia`, `IntersectionObserver`): se stubean con `vi.stubGlobal` en `beforeEach` y se restauran con `vi.unstubAllGlobals()` en `afterEach`.

### Tests de interacción

Los `<pantalla>.interaction.spec.ts` simulan lo que hace un usuario en una pantalla entera: hacen clic, escriben, abren diálogos y comprueban lo que se ve después de cada paso. Usan `@testing-library/angular` (`render`, `screen`, `within`, `waitFor`), `@testing-library/user-event` y los matchers de `@testing-library/jest-dom`, que cada spec activa con `import "@testing-library/jest-dom/vitest";` en la primera línea (no hay setup global).

- **Render**: `render(Pantalla, { providers, routes })` del entry principal de `@testing-library/angular`, que funciona con la app zoneless: tras cada evento de `user-event` y en cada `findBy*` / `waitFor` corre la detección de cambios de los fixtures montados. Si el recorrido cruza pantallas (crear algo y aterrizar en su detalle, login y redirección), se renderiza un host con `<router-outlet />` y las rutas reales, con `initialRoute`.
- **Consultas**: por rol y nombre accesible (`getByRole("button", { name: "Move Celeste up" })`, `getByRole("dialog", { name: "Edit run" })`, `getByLabelText("Notes")`), acotadas con `within(...)` cuando el mismo control se repite por fila o tarjeta. Las pantallas renderizan a la vez la versión de escritorio y la de mobile (jsdom no aplica Tailwind), así que un control puede aparecer dos veces: se acota al contenedor (`within(screen.getByRole("navigation", { name: "Filter by status" }))`) o se toma el primero. Cuando un overlay de escritorio y una barra táctil se alternan con `display: none`, jsdom muestra ambos aunque en un navegador solo uno llegue a la tecnología de asistencia.
- **API simulada con estado**: `provideHttpClient()` + `provideHttpClientTesting()` y una función `answer(req)` que responde cada petición como la API (lista, filtra, aplica `PATCH`, `PUT` y `DELETE` sobre un arreglo local) y lanza `Unexpected request` para cualquier URL que no conozca. `answerPending()` responde en rondas todo lo pendiente (`httpTesting.match(() => true)`), porque una respuesta dispara otras peticiones. `untilVisible(assertion)` envuelve `waitFor` y responde lo pendiente en cada intento: cubre los `debounceTime` de las búsquedas sin fake timers. `afterEach` responde lo que quede y llama a `httpTesting.verify()`.
- **Aserciones sobre la API**: además de lo visible, cada recorrido comprueba el body que llegó al servidor simulado (los `PATCH`, el orden que manda un `PUT`, los `DELETE`), guardado en arreglos que se vacían en `beforeEach`.
- **Sesión**: para que la pantalla sepa quién es el dueño se usa el servicio de sesión real y se llama a `loadUser()` después del render; el `GET` del usuario actual lo responde la API simulada.
- **Diálogos**: `DialogService` (ng-primitives) los monta en `document.body`; se buscan con `screen.findByRole("dialog", { name })`. Cuando se cierran desaparecen del DOM.
- **Popovers y menús**: el contenido de un overlay de ng-primitives se renderiza de forma reactiva, así que los atributos que ponen sus primitivos (`aria-multiselectable`, `aria-activedescendant`) aparecen un ciclo después de abrirlo. Tras abrirlo, `await fixture.whenStable()` antes de leer esos atributos o de navegar con el teclado.
- **Toasts con Undo**: se monta el contenedor de toasts en el host y se registra el fixture como componente raíz con `TestBed.inject(ApplicationRef).components.push(fixture.componentRef)`, porque `NgpToastManager` busca el `ViewContainerRef` en `applicationRef.components[0]`. El Undo se prueba con el botón _Undo_ y el commit con _Dismiss_, sin esperar la ventana de deshacer.
- **`@defer (on viewport)`**: en jsdom el disparador de viewport de Angular no llega a observar el placeholder aunque se stubee `IntersectionObserver`, así que un recorrido no puede depender de que un bloque diferido se renderice. Lo que el recorrido necesita ver se carga con una directiva de intersección propia (que sí usa el stub) o se prueba en el spec del componente.
- **Reordenar**: el drag & drop de CDK no se simula; se usan los botones "Move up/down" y "Move to top", que son la alternativa accesible que exige la app.
- **`Element.prototype.getAnimations`** (salida de los toasts) se define en `beforeEach` como `() => []` y se borra con `Reflect.deleteProperty` en `afterEach` cuando el spec no usa el entorno común.
- **Fechas**: para elegir una fecha como un usuario se usa un helper de test del date picker. Un mensaje de error se busca con `selector: "ui-field-error span"`, porque el texto va en un `span` junto al ícono.

## Nombres

- Archivos en `kebab-case`. Componentes y el service principal de una feature sin sufijo (`user-card.ts`, `orders.ts`); guards e interceptors con sufijo (`auth.guard.ts`, `auth.interceptor.ts`). Cuando una feature tiene varios services, van en `services/` con sufijo `.service.ts`.
- Clases, interfaces y tipos en `PascalCase`.
- Los tipos compartidos entre features (el contrato con la API) viven en `core/models/`. El resto de las `interface` y de los `type` que describen un objeto (también una unión de objetos) van en un `<archivo>.model.ts` junto al archivo que los usa, nunca dentro de un componente, service, guard, directiva o util; las uniones de literales que esos tipos necesitan viajan con ellos. Se quedan donde están los tipos derivados de una constante o función (`(typeof X)[number]`, `ReturnType<typeof injectX>`), las firmas de función y los tipos locales de un spec.
- Selectores con prefijo `app-` o `ui-` (lo valida ESLint). Los componentes de `shared/ui/` que extienden un elemento nativo usan selector de atributo (`<button uiButton>`).
- URLs en `kebab-case`.

## Diseño visual

### Temas y tokens

- Los tokens (`--color-*`, `--font-*`, `--radius-card`) se registran en `@theme` de Tailwind dentro de `src/styles.css`, y cada tema los redefine en su propio archivo (bloque `:root[data-theme="<id>"]`, importado desde `styles.css`). Las clases usan siempre los tokens (`bg-surface`, `text-brand`), nunca hex sueltos.
- Un servicio de tema aplica el tema con `data-theme` en `<html>` y lo persiste en `localStorage` (y en el usuario, si el producto lo guarda).
- Significado de los tokens de color:

| Token                              | Uso                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `brand`, `brand-hover`             | Acentos y texto de marca. Debe cumplir 4.5:1 sobre `canvas`, `surface` y `surface-hover` |
| `brand-solid`, `brand-solid-hover` | Superficies rellenas con texto blanco (botón primario, insignias). 4.5:1 con el blanco   |
| `brand-subtle`, `brand-glow`       | Fondos translúcidos y halos                                                              |
| `warning`                          | Naranja de advertencias                                                                  |
| `success`, `danger`, `info`        | Completado, destructivo/abandonado e información                                         |
| `nav-*`                            | Color de identidad de cada sección del menú                                              |

- Texto secundario y atenuado (`fg-secondary`, `fg-muted`) también cumplen 4.5:1 sobre los tres fondos, y en cada tema la jerarquía `fg` > `fg-secondary` > `fg-muted` debe seguir siendo visible. Al tocar un tema, recalcular los contrastes.
- Los colores de estado o de rol que identifican algo (premium, administrador, progreso) son un token propio y distinto en cada tema, y no se reutilizan para otra cosa.
- Sombras y `drop-shadow` son tokens (`--shadow-*`, `--drop-shadow-*` en `@theme`). Son negras con alfa y no varían por tema, así que los archivos de tema no las redefinen. Una sombra escrita con `shadow-[...]` que se usa en más de un sitio pasa a token.
- Superficies y bordes: `canvas`, `sidebar`, `surface`, `surface-hover`, `input-bg`, `line` y `line-hover`. Un hover sobre una fila usa `hover:bg-surface-hover`. Nunca se usa blanco o negro con alfa (`bg-white/[0.03]`), porque no se adapta a los temas.
- La raíz mide **14px** (`html { font-size: 14px }`), así que las clases en rem de Tailwind salen un 12,5% más chicas: `h-11` mide 38,5px y `gap-2` mide 7px. Los tamaños mínimos (44px táctiles, separaciones de 8px) se escriben en px: `min-h-[44px]`, `gap-[8px]`.

### Tipografía

- Una fuente de títulos y cifras destacadas (`font-display`) y otra para el texto (`font-sans`), servidas localmente (subconjuntos latin y latin-ext, `font-display: swap`). No se cargan fuentes de terceros.
- Si la licencia es SIL Open Font License, su texto (`*-OFL.txt`) va junto a los archivos y debe acompañar a cualquier fuente que se agregue.
- Columnas de datos con `tabular-nums`.

### Shell

- El shell autenticado tiene barra lateral (o riel colapsado) y topbar con búsqueda en escritorio; topbar, barra inferior de pestañas y hoja "More" en mobile. El shell de visitantes es una versión reducida.
- El scroll vive en `main` (`.page-scroller`, contenedor de consultas `page`); cada página va dentro de `.page-shell`. No se pone `isolate` en `<main>`, porque rompe el apilamiento de las hojas inferiores.
- Medidas del shell como variables CSS en `styles.css` (altura de topbar y tabbar, ancho máximo y padding de página). Las barras fijas se pegan con `top-[var(--topbar-height)]`.
- Toda la configuración de los toasts vive en un solo objeto de configuración y hay un solo contenedor de toasts, montado en el shell. `ng-primitives/toast` se carga con `import()` dinámico para sacarlo del bundle inicial, así que no hay `provideToastConfig` en `app.config.ts`.

### Utilidades globales (`src/styles.css`)

| Utilidad                                  | Qué hace                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Variante `tap:`                           | Aplica en pantallas de menos de 640px **o** con puntero táctil. Se usa para tamaños táctiles (`tap:min-h-[44px]`) |
| `pointer-coarse:`                         | Solo para mostrar u ocultar según el puntero, nunca para tamaños                                                  |
| `.tap-area`                               | Amplía el área táctil a 44px con un `::after` invisible, sin cambiar el tamaño visual                             |
| `.bleed`, `.bleed-inner`, `.bleed-top`    | Llevan un bloque a todo el ancho del contenedor de página manteniendo el contenido alineado con el resto          |
| `.poster-grid`, `.poster-grid-actionable` | Grilla de portadas; la variante con acciones usa columnas más anchas en mobile                                    |
| `.bleed-scroll-snap`                      | Alinea el scroll horizontal de carruseles con el margen de la página                                              |

- `.tap-area` dentro de un contenedor con `overflow-x-auto` necesita padding vertical táctil en el contenedor (`pointer-coarse:py-[8px]`) para que el área no se recorte. Tampoco se usa en enlaces de líneas contiguas, porque las áreas invisibles se solapan: ahí cada enlace lleva `tap:min-h-[44px]`.
- El design system (`styles/ui.css`) ya da 44px bajo 768px o con puntero táctil a botones, botones de ícono, pestañas e interruptores; el input mide 44px en todos los anchos salvo `size="sm"`. Los elementos propios usan `tap:` o `.tap-area`.
- `styles/ui.css` no está en una capa de cascada, así que sus reglas ganan a las utilidades de Tailwind: para cambiar `display`, tamaño, borde o fondo de un `uiButton` / `uiIconButton` hace falta `!` (`sm:!hidden`). Un color propio del texto de un botón `link` va en un `<span data-link-label>` hijo.

### Patrones de composición

- **Encabezado de página**: el componente de encabezado es el único dueño de la separación entre su contenido y la línea inferior. Las vistas no ponen `mb-*` ni `pb-*` en el contenido proyectado, y el contenedor de acciones se oculta vacío (`empty:hidden`). Si el contenido proyectado necesita padding táctil por estar en un `overflow-x-auto`, se compensa con un margen negativo igual.
- **Hero de detalle**: ocupa todo el ancho con `bleed bleed-top`. Lleva una imagen difuminada y otra nítida con máscara, un degradado hacia `canvas`, el contenido alineado abajo en `bleed-inner` y `fetchpriority="high"` en la imagen principal. Lo de más abajo usa `loading="lazy"`.
- **Eyebrow + título**: un eyebrow en mayúsculas con `tracking` amplio y color de marca, y debajo el título en `font-display font-bold tracking-tight`. El eyebrow es el componente `uiEyebrow` con su tono, nunca clases escritas a mano. Las etiquetas de formulario usan `uiFieldLabel` (texto normal) y los títulos de sección dentro de formularios o listas, `uiEyebrow` con el tono por defecto.
- **Barra de herramientas fija**: `sticky` bajo la topbar, fondo `canvas` translúcido con `backdrop-blur`.
- **Hero o barra**: el lugar de un control lo decide si cambia datos o solo la vista. En las acciones del hero van las que crean o cambian datos: como máximo una primaria y una secundaria, y el resto en un menú de acciones `⋯`. En la barra va lo que solo cambia cómo se ve la lista, siempre en el mismo orden (búsqueda, vista guardada, filtros, orden, modo de vista, exportar). Un control queda en la misma zona en escritorio y en mobile; en mobile se adapta (fila completa, hoja inferior), no se muda.
- **Listas minimalistas** (feed, cola, actividad): filas con `divide-y divide-line`, miniatura, una frase con los nombres resaltados y la hora a la derecha. Sin tarjetas.
- **Estados completos**: el esqueleto tiene la forma real del contenido (nunca "Loading..."). El vacío lleva ícono, título, texto y una acción útil. El error y el privado explican qué pasó y ofrecen una salida.
- **Carruseles con rotación**: se pausan con hover o foco, tienen botón de pausa, no rotan con `prefers-reduced-motion` y usan `aria-live="off"` mientras rotan.
- **Datos con color**: nunca solo color; siempre etiqueta y número.
- **Navegación con enlaces reales** (`routerLink`), no botones con `router.navigate`. Los botones quedan para acciones.

### Fechas y errores de campo

- **Fechas.** Se eligen con el date picker del design system, nunca con `<input type="date">` ni `type="datetime-local"`: el nativo muestra el formato y el calendario del sistema según el idioma y no sigue el tema. Los límites se llaman `minDate` / `maxDate` porque Angular no deja enlazar `min` / `max` junto a `[formField]` (NG8022). Un par From / To pasa cada extremo como límite del otro, así nunca queda From > To.
- La etiqueta de un date picker va afuera con `<label uiFieldLabel [for]>` apuntando a su `triggerId`, sin `uiFormField` ni `uiLabel`, que reescriben el `for` hacia un control de ng-primitives.
- **Errores de campo.** Todo error bajo un campo es `UiFieldError`, enlazado por `aria-describedby`, con `aria-invalid` en el campo. No tiene rol por defecto para que el lector no lo anuncie dos veces; `announce` le pone `role="alert"` cuando el error llega con el foco en otro lado. Los errores de una acción que no pertenecen a un campo van como texto con `role="alert"`.
- **Errores del servidor en formularios:** un error del servidor se oculta en cuanto el usuario cambia el valor que lo produjo, comparando contra una foto de los valores enviados, y reaparece si vuelve a ese valor.

### Patrones de interacción

- **Mobile primero:** toda acción se puede hacer con el dedo y nada depende solo del hover. En filas y tarjetas, escritorio muestra íconos (32px, 44px con `tap:`) y mobile un menú de acciones solo con ícono que abre la hoja con las acciones con texto.
- Mostrar u ocultar según **tamaño de pantalla y puntero a la vez** (`max-sm:` y `pointer-coarse:`), nunca solo por puntero: un navegador angosto con mouse tiene que funcionar igual que un celular.
- En mobile se **adapta** el formato de la vista, no se reemplaza por otro: una grilla de portadas sigue siendo grilla. Si el diseño de escritorio ya funciona, se conserva y solo se adapta mobile.
- Las opciones de un menú aparecen debajo del disparador o en la hoja, nunca sobre el contenido.
- Reordenar siempre ofrece una alternativa al arrastre (flechas o "Move up/down"), y el arrastre solo empieza desde el asa (`cdkDragHandle`).
- **Selección masiva** solo con la casilla: el clic en la fila sigue abriendo el editor. Los predicados de elegibilidad son funciones puras compartidas entre la tabla y la tarjeta, no se reescriben por página.
- **Acciones destructivas:** las reversibles (quitar de una colección) usan un toast pendiente con _Undo_, con una ventana de deshacer única para toda la app que no se configura por pantalla. Las irreversibles y dejar de seguir a alguien piden confirmación con un diálogo de tono `danger`, nunca con una confirmación en línea.
- **Errores que avisa el interceptor:** los errores que el interceptor global ya muestra como toast (topes del plan, conflictos, validación, rate limit) no se repiten en las pantallas: se consulta con un helper (`isToastedByErrorInterceptor(status)`).
- **Descargas:** todo archivo se baja con un único servicio de descargas, que pide el formato por el header `Accept`, toma el nombre de `Content-Disposition` y descarga con un `<a download>` temporal.

### Proceso de diseño y verificación

- Cada decisión de UI, por chica que sea, se respalda con guías de UX y con la documentación actual de Angular, Tailwind y ng-primitives, no con lo que uno recuerda.
- Un cambio visual se verifica en tres casos: escritorio con mouse (1440×900), navegador angosto con mouse (390px) y celular táctil emulado (390×844). En cada uno se revisa que no haya objetivos táctiles de menos de 44px, desbordamiento horizontal ni errores de consola.
- Si una vista pública reutiliza la propia, el cambio en un componente compartido llega solo a las dos, pero la estructura de página puede seguir duplicada: al cambiar una, se revisan ambas.
