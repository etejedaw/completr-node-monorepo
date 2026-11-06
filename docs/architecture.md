# Arquitectura

Cómo está organizado el código y cómo se escribe. Las reglas que el código hace cumplir y cuyo porqué no se ve en él están en [`rules.md`](./rules.md), el flujo de trabajo (ramas, commits, tests, post-edición) en [`context/conventions.md`](./context/conventions.md) y el detalle de cada subsistema en [`context/`](./context/). Lo que ya hacen cumplir ESLint y Prettier (formato, orden de imports, `any`, selectores de Angular) no se repite acá.

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
├── app.ts                  # Bootstrap: initDatabase, warnings de providers y listen
├── server.ts               # createApp(): arma la app Express (routers y middlewares globales) sin listen
├── common/                 # Infraestructura compartida (no es un módulo de negocio)
│   ├── config/             # Variables de entorno y configuración (CORS, rate limiter, DB)
│   ├── errors/             # Clases base (ServiceError, DomainError, HttpError) + normalizers globales
│   ├── middlewares/        # correlation-id, logger, validate-schema, rate-limiter, error-handler
│   ├── schemas/            # Schemas Zod reusables (paginación, búsqueda)
│   ├── interfaces/         # Interfaces compartidas (RequestUser, JwtPayload)
│   ├── logger/             # Pino + interface
│   ├── types/              # Alias type compartidos y augmentations globales (express.d.ts)
│   └── utils/              # Helpers genéricos
├── database/               # Conexión Sequelize, asociaciones, init
├── auth/  users/  games/   # Módulos de negocio
├── backlog/  lists/  ...   # ...
├── rawg/  igdb/  ia/ ...   # Providers de servicios externos
├── scraping/               # Cliente HTTP compartido de los scrapers: cola y throttle por host
└── jobs/                   # Cron jobs y tareas programadas
```

`createApp()` devuelve la app sin abrir un puerto y `app.ts` es el único que llama a `listen`, para que los tests de integración usen la misma app que producción.

Cada módulo de negocio sigue la misma estructura interna, descrita en [`context/modules.md`](./context/modules.md); cada provider, la de [`context/providers.md`](./context/providers.md). En `common/`, en los módulos y en los providers, los `*.interface.ts` solo declaran `interface` y los `*.types.ts` solo alias `type` (regla completa en [`context/modules.md`](./context/modules.md#modulointerfacets-y-modulotypests)).

## Capas dentro de un módulo

```
Route → Middleware (auth, rate-limit, validate-schema)
      → Controller → Service → Model
                  ↘ Serializer (transforma respuesta al frontend)
```

Qué hace y qué no hace cada capa está en [`context/modules.md`](./context/modules.md#responsabilidades-por-archivo); qué error lanza cada una, en [`context/errors.md`](./context/errors.md).

## Flujo de un request

1. `correlationIdMiddleware` asigna un UUID por request para trazabilidad en logs.
2. `loggerMiddleware` loguea inicio/fin.
3. Por endpoint: `authMiddleware` (verifica JWT y rol) → `rateLimiterMiddleware` → `validateSchemaMiddleware` (parsea body/params/query con Zod y guarda el resultado en `request.locals`, porque en Express 5 `request.query` es inmutable).
4. Controller ejecuta la operación.
5. Si todo sale bien → response JSON con `{ data: ... }`.
6. Si algo lanza un error → `errorHandlerMiddleware` lo normaliza (`ServiceError` → `DomainError` → `HttpError`) y responde con el formato Problem Details.

## Cómo se escribe el código

### Nombres

- Variables y funciones en `camelCase`; clases, tipos e interfaces en `PascalCase`, sin prefijo `I`; constantes globales en `SCREAMING_SNAKE_CASE`.
- Funciones constructoras de errores en `camelCase` descriptivo (`gameNotFound`, `uniqueConstraintError`). Los códigos de error siguen el patrón de [`context/errors.md`](./context/errors.md#reglas-duras).
- Nombres de archivo de un módulo: ver [`context/modules.md`](./context/modules.md#nombres-de-archivo).
- Imports relativos entre módulos (`../games/games.service`).

### Comentarios

No se añaden comentarios. El código tiene que explicarse solo: nombres claros, funciones cortas, una responsabilidad por archivo. Si hace falta un comentario para entenderlo, antes se renombra o se parte la función.

Solo se permiten cuando el código no puede explicarse a sí mismo: una regex no trivial (qué pretende matchear), un workaround para un bug de una librería o servicio externo, o una restricción legal o externa que justifica una decisión que parece arbitraria. Nunca referencias a tareas, issues o PRs: eso va en el commit.

### Alcance de cada cambio

- No agregar features, refactors ni abstracciones más allá de la tarea. Tres líneas parecidas son mejores que una abstracción prematura.
- No agregar manejo de errores defensivo para casos que no pueden ocurrir. Se valida solo en los bordes (input de usuario, APIs externas).
- No dejar implementaciones a medias ni shims de retrocompatibilidad cuando se puede cambiar el código.
- Lo que no se usa se elimina, no se renombra a `_var` para silenciar el linter.
- Funciones cortas, una responsabilidad. Si un service crece, se parte en `services/` (ver `auth/services/password.service.ts` + `token.service.ts`).

### Mecanismos compartidos que no se reimplementan

- **Búsqueda de texto:** todo `search` pasa por `common/utils/text-search.util.ts` (normalización sin acentos ni signos, palabras en cualquier orden, orden por relevancia). Ningún service arma su propio `ILIKE`.
- **Errores de Sequelize:** se traducen con `rethrowSequelizeError` (ver [`context/errors.md`](./context/errors.md#patrón-rethrowsequelizeerror)).
- **Acciones masivas:** `buildBulkActionQuerySchema`, `validateBulkBodyMiddleware` y `BulkIdsSchema` en `common/`, con la respuesta `{ action, succeeded, skipped }`.
- **Exportaciones:** `exportFormatNegotiationMiddleware`, `exportFormatAccessMiddleware` y `serializeCsv()`; las columnas de cada recurso, en su `*.export-row.mapper.ts`.
- **Acceso premium:** los gates consultan `resolvePremiumAccess(user, feature)`, nunca el rol directamente, para que el rol y una concesión temporal den el mismo acceso.

## Integraciones externas

Los servicios externos (RAWG, IGDB, HLTB, Metacritic, Wikidata, SMTP, IA) viven como **providers** en `apps/api/src/<nombre>/`. Son adapters: encapsulan HTTP o scraping, exponen una interfaz limpia y no contienen lógica de negocio. Cuando una capacidad puede cumplirla más de un proveedor (mail, IA), el provider es una clase de la capacidad que recibe el proveedor concreto por constructor. Las dos formas están en [`context/providers.md`](./context/providers.md).

## Imágenes para compartir

`rewind-share/` dibuja en el servidor las imágenes del Rewind (story 1080×1920 y og 1200×630) y la página HTML de vista previa de enlaces. No tiene modelo propio: pide los datos a `rewind.service` y por eso hereda su privacidad y sus errores.

- Las plantillas son árboles de objetos `{ type, props }`, sin JSX, y solo admiten flexbox: es lo que entiende satori. Story y og comparten los bloques de `templates/rewind-blocks.template.ts`.
- Las fuentes son los `.woff` estáticos de `@fontsource/chakra-petch` y `@fontsource/manrope`, porque satori no lee woff2 ni fuentes variables. resvg corre con `loadSystemFonts: false` para que el resultado no dependa del sistema.
- La caché de PNG es un LRU en memoria por proceso, con el hash del JSON del Rewind en la clave (un cambio en los datos genera otra entrada). Se pierde al reiniciar, y una imagen con portadas que no se pudieron descargar no se guarda, para no dejar fija una versión incompleta.
- Las URLs viven bajo `/share/rewind/:username/:year/` en el dominio de la web, porque ahí `/users` es una ruta de Angular. Cómo llega ese pedido a la API está en [`context/frontend.md`](./context/frontend.md#conexión-con-el-backend).

## Logs

La API loguea con Pino (`common/logger/pino.config.ts`) y el destino depende de `NODE_ENV`:

- `dev`: `pino-pretty` en la consola, nivel `debug`.
- `test`: JSON en `<cwd>/logs/app.log`, sin rotación.
- `prod`: JSON a la salida estándar (lo que muestra el visor de logs de CapRover) y a `<cwd>/logs/` con `pino-roll` (un archivo por día o cada 10 MB, 7 anteriores más el activo, `current.log` apunta al activo). En la imagen el directorio es `/usr/app/logs`, y para que sobreviva a los deploys se monta como volumen desde la configuración de la app en CapRover.

## Decisiones clave

- **UUIDs en todas las PKs y FKs.** Nunca `id: number`. Cada modelo declara sus columnas FK con `DataTypes.UUID`: como no hay `sync()`, Sequelize nunca infiere el tipo desde la asociación, así que no hace falta repetirlo en `associations.database.ts`.
- **Soft delete con `isActive`** en Games y Users: dar de baja un juego o desactivar una cuenta no borra filas. Las excepciones (borrado físico de un juego y de una cuenta) y lo que exigen están en [`rules.md`](./rules.md).
- **Slugs/codes auto-generados** desde el título con `slugify` para URLs amigables.
- **Variables de entorno** se cargan con `--env-file` (Node 22+) desde `apps/api/.env.dev.local` (opcional) o `apps/api/.env.prod.local`, no con `dotenv`. Se exponen tipadas desde `common/config/`.
- **El esquema de la DB lo definen solo las migraciones**, no hay `sync()`. Cada FK declara su `ON DELETE` en la migración, igual al `onDelete` de su asociación en `associations.database.ts`.
- **Los modelos nunca se importan entre módulos**: se accede a los datos de otro módulo por su `service`. Regla y excepciones en [`context/modules.md`](./context/modules.md#comunicación-entre-módulos).
- **Toda lógica de cálculo vive en el backend** (ratio, estadísticas, derivados), en el serializer o el service. El frontend solo renderiza.
