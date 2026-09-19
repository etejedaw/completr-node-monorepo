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

## Estructura de carpetas

```
apps/api/src/
├── app.ts                  # Bootstrap (initDatabase + server)
├── server.ts               # Express app, registro de routers y middlewares globales
├── common/                 # Infraestructura compartida (no es un módulo de negocio)
│   ├── config/             # Variables de entorno y configuración (CORS, rate limiter, DB)
│   ├── errors/             # Clases base (ServiceError, DomainError, HttpError) + normalizers globales
│   ├── middlewares/        # correlation-id, logger, validate-schema, rate-limiter, error-handler
│   ├── schemas/            # Schemas Zod reusables (paginación, búsqueda)
│   ├── interfaces/         # Tipos compartidos (RequestUser, JwtPayload)
│   ├── logger/             # Pino + interface
│   ├── types/              # Augmentations de tipos globales (express.d.ts)
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

## Decisiones clave

- **UUIDs en todas las PKs y FKs.** Nunca `id: number`.
- **Soft delete con `isActive`** en Games y Users — no se borra físicamente.
- **Slugs/codes auto-generados** desde el título con `slugify` para URLs amigables.
- **Rate limiting diferenciado** por tipo de endpoint (auth, registro, público, usuario). Configurado en `common/config/rate-limiter.config.ts`.
- **Variables de entorno** se cargan con `--env-file=.env` (Node 22+), no `dotenv`. Se exponen tipadas desde `common/config/`.
- **`request.locals` como contenedor de datos validados.** Extendido por declaration merging en `common/types/express.d.ts`.
- **Toda lógica de cálculo vive en backend** (ratio, estadísticas, derivados). El frontend solo renderiza.
- **Los modelos nunca se importan entre módulos** — se accede vía el `service` del módulo dueño. Excepción: tablas pivote para asociaciones Sequelize. Ver [`context/modules.md`](./context/modules.md).

## Documentación relacionada

- [`invariants.md`](./invariants.md) — Lo que el código hace cumplir: enums, constraints, validaciones, comportamientos automáticos.
- [`README.md`](../README.md) — Setup local y scripts.
