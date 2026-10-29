# Arquitectura

Vista panorámica del proyecto. Para detalle de cada subsistema, ver los archivos en [`context/`](./context/).

## Estructura del repo

Monorepo con npm workspaces:

| Carpeta        | Qué contiene                                                                     |
| -------------- | -------------------------------------------------------------------------------- |
| `apps/api`     | Backend (este documento), migraciones Sequelize, scripts y compose de desarrollo |
| `apps/web`     | Frontend Angular. Ver [`context/frontend.md`](./context/frontend.md)             |
| `apps/landing` | Landing Astro estática. Ver [`context/landing.md`](./context/landing.md)         |
| `docs/`        | Documentación técnica y changelog de las apps                                    |

El `package-lock.json`, ESLint, Prettier, Husky y lint-staged viven en la raíz. Cada app tiene su `Dockerfile` y un `captain-definition-<app>` en la raíz; el contexto de build de Docker es siempre la raíz del repo.

El resto de este documento describe el backend.

`createApp()` devuelve la app sin abrir un puerto; `app.ts` es el único que llama a `listen`. Así los tests de integración usan la misma app con `supertest` (ver [`context/conventions.md`](./context/conventions.md#tests-de-la-api)).

## Stack

| Capa           | Tecnología                               |
| -------------- | ---------------------------------------- |
| Runtime        | Node.js 22+ (TypeScript, ts-node en dev) |
| Framework HTTP | Express 5                                |
| ORM            | Sequelize 6                              |
| Base de datos  | PostgreSQL                               |
| Autenticación  | JWT (access + refresh) + bcrypt          |
| Validación     | Zod v4                                   |
| Logging        | Pino                                     |
| Seguridad      | Helmet, CORS, rate-limiter-flexible      |
| Imágenes       | satori (SVG) + @resvg/resvg-js (PNG)     |

## Estructura de carpetas

```
apps/api/src/
├── app.ts                  # Bootstrap: initDatabase, warning de RAWG y listen
├── server.ts               # createApp(): arma la app Express (routers y middlewares globales) sin listen
├── common/                 # Infraestructura compartida (no es un módulo de negocio)
│   ├── config/             # Variables de entorno y configuración (CORS, rate limiter, DB)
│   ├── errors/             # Clases base (ServiceError, DomainError, HttpError) + normalizers globales
│   ├── middlewares/        # correlation-id, logger, validate-schema, rate-limiter, error-handler
│   ├── schemas/            # Schemas Zod reusables (paginación, búsqueda)
│   ├── interfaces/         # Interfaces compartidas (RequestUser, JwtPayload)
│   ├── logger/             # Pino + interface
│   ├── types/              # Alias type compartidos (ExportRow, RangeWhere) y augmentations globales (express.d.ts)
│   └── utils/              # Helpers genéricos
├── database/               # Conexión Sequelize, asociaciones, init
├── auth/  users/  games/   # Módulos de negocio
├── platforms/  genres/     # ...
├── backlog/  game-shelf/   # ...
├── lists/  list-items/     # ...
├── wishlist/  favorites/   # ...
├── rawg/                   # Provider de RAWG API (adapter externo)
└── jobs/                   # Cron jobs y tareas programadas
```

Cada módulo de negocio sigue la **misma estructura interna**. Ver [`context/modules.md`](./context/modules.md).

En `common/`, en los módulos y en las capacidades, los `*.interface.ts` solo declaran `interface` y los `*.types.ts` los alias `type`; la regla completa y sus excepciones están en la anatomía de [`context/modules.md`](./context/modules.md#modulointerfacets-y-modulotypests).

## Capas dentro de un módulo

```
Route → Middleware (auth, rate-limit, validate-schema)
      → Controller → Service → Model
                  ↘ Serializer (transforma respuesta al frontend)
```

- **Route** define el endpoint, middlewares y el handler.
- **Middleware** valida auth, rate limit y schema. El schema validado se guarda en `request.locals` (no en `request.query`, que en Express 5 es inmutable).
- **Controller** lee de `request.locals`, orquesta llamadas a services, lanza `DomainError` si una regla de negocio falla, serializa y responde.
- **Service** ejecuta la lógica y queries a DB. Si algo falla, lanza `ServiceError` (nunca `DomainError`).
- **Model** es la definición Sequelize.
- **Serializer** transforma el modelo a la forma final que ve el frontend (cálculos como ratio van aquí, no en el frontend).

## Flujo de un request

1. `correlationIdMiddleware` asigna un UUID por request para trazabilidad en logs.
2. `loggerMiddleware` loguea inicio/fin.
3. Por endpoint: `authMiddleware` (verifica JWT y rol) → `rateLimiterMiddleware` → `validateSchemaMiddleware` (parsea body/params/query con Zod).
4. Controller ejecuta la operación.
5. Si todo sale bien → response JSON con `{ data: ... }`.
6. Si algo lanza un error → `errorHandlerMiddleware` lo captura, lo normaliza (`ServiceError` → `DomainError` → `HttpError`) y responde con el formato Problem Details.

Ver [`context/errors.md`](./context/errors.md) para el detalle del sistema de errores.

## Integraciones externas

Los servicios externos (RAWG, HLTB, Metacritic, Steam) viven como **providers** en `apps/api/src/<nombre>/`. Son adapters: encapsulan HTTP/scraping y exponen una interfaz limpia. No contienen lógica de negocio.

Ver [`context/providers.md`](./context/providers.md).

### Provider con modelo inyectable

Cuando una capacidad puede cumplirla más de un proveedor externo (IA con DeepSeek, OpenAI u otro), el provider no es el proveedor: es una clase propia de la capacidad que recibe por constructor la implementación concreta. Siguen esta forma `apps/api/src/ia/` (`IaProvider` con `DeepseekModel`) y `apps/api/src/mail/` (`MailProvider` con `NodemailerModel`, o `InMemoryMailModel` en tests).

```
apps/api/src/<capacidad>/
├── <capacidad>.interface.ts    Tipos de request/response y la interfaz <Capacidad>Model
├── <capacidad>.provider.ts     class <Capacidad>Provider { constructor(private readonly model: <Capacidad>Model) }
│                               export const <capacidad>Provider = new <Capacidad>Provider(<Proveedor>Model.create(...))
├── errors/                     Errores en 3 capas de la capacidad, no del proveedor
└── <proveedor>/
    └── <proveedor>.provider.ts <Proveedor>Model implements <Capacidad>Model, con static create y su variante Disabled
```

- **Un solo punto de entrada.** El resto de la API importa solo la instancia `<capacidad>Provider` de `<capacidad>/<capacidad>.provider`. Nadie crea su propia instancia ni importa el submódulo del proveedor desde `apps/api/src/`: lo prohíbe una regla `no-restricted-imports` en `eslint.config.mjs`, que hay que ampliar con cada capacidad nueva. Los tests sí pueden importar los modelos internos.
- **El contrato es la interfaz `<Capacidad>Model`**, escrita en términos de la capacidad (por ejemplo `generateText` e `isEnabled`), nunca en los del proveedor. Los tipos propios del proveedor (settings, forma de la respuesta) quedan dentro de su submódulo.
- **La clase de la capacidad hace lo común a todos los proveedores:** validar la entrada, normalizarla, exponer si hay un modelo configurado y rechazar con el error de "no configurado" de la capacidad (por ejemplo `mailProvider.assertConfigured()`), en vez de que cada consumidor lo compruebe por su cuenta. El submódulo del proveedor solo habla con el servicio externo y traduce sus fallos a los errores de la capacidad.
- **Cambiar de proveedor** es escribir otro submódulo que implemente la interfaz y cambiar la línea que crea la instancia. Los consumidores no se tocan.
- **Configuración:** las keys de servicios externos van en `common/config/api-keys.config.ts`, y los ajustes que sí cambian por entorno, en el `*.config.ts` de la capacidad (por ejemplo `mail.config.ts` con el servidor SMTP). El archivo `<capacidad>.provider.ts` los lee y se los pasa al modelo por constructor. Lo que es fijo del proveedor (modelo, timeout, URL base) es una constante de su clase, no una variable de entorno.
- **Tests:** la clase de la capacidad se prueba con un modelo falso que implementa la interfaz; cada proveedor se prueba aparte con `fetch` (o su transporte) simulado.

Un servicio externo que no tiene alternativas intercambiables sigue la forma simple de un provider, como `rawg/`: clase base abstracta con `static create`, la implementación activa y la `Disabled`.

## Imágenes para compartir

`rewind-share/` dibuja en el servidor la imagen del Rewind (story 1080×1920 y og 1200×630) y la página HTML de vista previa de enlaces. No tiene modelo propio: pide los datos a `rewind.service` y por eso hereda su privacidad y sus errores.

- **Render:** satori convierte un árbol de elementos (objetos `{ type, props }`, sin JSX; solo flexbox) en SVG con el texto ya trazado, y resvg lo pasa a PNG con `loadSystemFonts: false`. Las fuentes son los `.woff` estáticos de `@fontsource/chakra-petch` y `@fontsource/manrope` (satori no lee woff2 ni fuentes variables), resueltas con `require.resolve` y leídas una sola vez por proceso.
- **Portadas:** se descargan del `coverUrl` con un timeout de 3 s y un tope de 5 MB, y se incrustan como data URI. Solo se aceptan PNG y JPEG (por firma de bytes) y URLs `http(s)`; las de RAWG se piden redimensionadas a 420 px. Si fallan, se dibuja un degradado con el título.
- **Caché:** LRU en memoria de 100 PNG por proceso, con clave usuario, año, formato y hash SHA-256 del JSON del Rewind; un cambio en los datos genera otra entrada. Las peticiones simultáneas a la misma imagen comparten el render, y una imagen con portadas que no se pudieron descargar no se guarda. Se pierde al reiniciar la API.
- **URLs absolutas:** el `og:image` y la redirección se arman con `WEB_APP_URL`. La imagen vive bajo `/share/rewind/:username/:year/` (`og.png` y `story.png`), junto a la página de vista previa, porque en el dominio de la web `/users` es una ruta de Angular. En producción el nginx de la web hace proxy de `/share/` a la API (ver [`context/frontend.md`](./context/frontend.md)); en local lo hace `proxy.conf.json` de `ng serve`.

## Decisiones clave

- **UUIDs en todas las PKs y FKs.** Nunca `id: number`.
- **Soft delete con `isActive`** en Games y Users — no se borra físicamente.
- **Slugs/codes auto-generados** desde el título con `slugify` para URLs amigables.
- **Rate limiting diferenciado** por tipo de endpoint (auth, registro, público, usuario). Configurado en `common/config/rate-limiter.config.ts`.
- **Variables de entorno** se cargan con `--env-file` (Node 22+) desde `apps/api/.env.dev.local` (opcional) o `apps/api/.env.prod.local`, no `dotenv`. Se exponen tipadas desde `common/config/`.
- **`request.locals` como contenedor de datos validados.** Extendido por declaration merging en `common/types/express.d.ts`.
- **Toda lógica de cálculo vive en backend** (ratio, estadísticas, derivados). El frontend solo renderiza.
- **El esquema de la DB lo definen solo las migraciones.** Cada FK declara su `ON DELETE` en la migración (`REFERENCES "Tabla"(id) ON DELETE CASCADE`), igual al `onDelete` de su asociación en `associations.database.ts`.
- **Los modelos nunca se importan entre módulos** — se accede vía el `service` del módulo dueño. Excepción: tablas pivote para asociaciones Sequelize. Ver [`context/modules.md`](./context/modules.md).

## Documentación relacionada

- [`invariants.md`](./invariants.md) — Lo que el código hace cumplir: enums, constraints, validaciones, comportamientos automáticos.
- [`README.md`](../README.md) — Setup local y scripts.
