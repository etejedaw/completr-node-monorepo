# Arquitectura

Estándares de organización y escritura de código para un backend Node + Express + Sequelize dentro de un monorepo de npm workspaces. Son portables: no dependen de las features del proyecto. Lo propio del proyecto (reglas con su porqué, infraestructura, integraciones concretas, mecanismos compartidos) está en [`rules.md`](./rules.md); el flujo de trabajo en [`context/conventions.md`](./context/conventions.md) y el detalle de cada subsistema en [`context/`](./context/). Lo que ya hacen cumplir ESLint y Prettier (formato, orden de imports, `any`, selectores de Angular) no se repite acá.

## Estructura del repo

Monorepo con npm workspaces:

| Carpeta      | Qué contiene                                                                              |
| ------------ | ----------------------------------------------------------------------------------------- |
| `apps/<app>` | Una carpeta por app (API, web, landing), cada una con su `package.json` y su `Dockerfile` |
| `docs/`      | Documentación técnica, colección de la API y changelog único de todas las apps            |

El contexto de build de Docker de cada app es la raíz del repo, no `apps/<app>`: el `package-lock.json` vive en la raíz y sin él `npm ci` no funciona dentro de la imagen.

El resto de este documento describe el backend. El frontend está en [`context/frontend.md`](./context/frontend.md) y la landing en [`context/landing.md`](./context/landing.md).

## Estructura de carpetas

```
apps/api/src/
├── app.ts                  # Bootstrap: conexión a la DB, avisos de configuración y listen
├── server.ts               # createApp(): arma la app Express (routers y middlewares globales) sin listen
├── common/                 # Infraestructura compartida (no es un módulo de negocio)
│   ├── config/             # Variables de entorno y configuración tipada
│   ├── errors/             # Clases base (ServiceError, DomainError, HttpError) + normalizers globales
│   ├── middlewares/        # correlation-id, logger, validate-schema, rate-limiter, error-handler
│   ├── schemas/            # Schemas Zod reusables (paginación, búsqueda)
│   ├── interfaces/         # Interfaces compartidas
│   ├── logger/             # Pino + interface
│   ├── types/              # Alias type compartidos y augmentations globales (express.d.ts)
│   └── utils/              # Helpers genéricos
├── database/               # Conexión Sequelize, registro de modelos y asociaciones
├── <modulo>/               # Un módulo de negocio por carpeta
├── <proveedor>/            # Un provider de servicio externo por carpeta
└── jobs/                   # Tareas programadas
```

`createApp()` devuelve la app sin abrir un puerto y `app.ts` es el único que llama a `listen`, para que los tests de integración usen la misma app que producción.

Cada módulo de negocio sigue la estructura de [`context/modules.md`](./context/modules.md); cada provider, la de [`context/providers.md`](./context/providers.md). En `common/`, en los módulos y en los providers, los `*.interface.ts` solo declaran `interface` y los `*.types.ts` solo alias `type` (regla completa en [`context/modules.md`](./context/modules.md#modulointerfacets-y-modulotypests)).

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
- Funciones constructoras de errores en `camelCase` descriptivo (`<recurso>NotFound`, `uniqueConstraintError`). Los códigos de error siguen el patrón de [`context/errors.md`](./context/errors.md#reglas-duras).
- Nombres de archivo de un módulo: ver [`context/modules.md`](./context/modules.md#nombres-de-archivo).
- Imports relativos entre módulos (`../<modulo>/<modulo>.service`).

### Comentarios

No se añaden comentarios. El código tiene que explicarse solo: nombres claros, funciones cortas, una responsabilidad por archivo. Si hace falta un comentario para entenderlo, antes se renombra o se parte la función.

Solo se permiten cuando el código no puede explicarse a sí mismo: una regex no trivial (qué pretende matchear), un workaround para un bug de una librería o servicio externo, o una restricción legal o externa que justifica una decisión que parece arbitraria. Nunca referencias a tareas, issues o PRs: eso va en el commit.

### Alcance de cada cambio

- No agregar features, refactors ni abstracciones más allá de la tarea. Tres líneas parecidas son mejores que una abstracción prematura.
- No agregar manejo de errores defensivo para casos que no pueden ocurrir. Se valida solo en los bordes (input de usuario, APIs externas).
- No dejar implementaciones a medias ni shims de retrocompatibilidad cuando se puede cambiar el código.
- Lo que no se usa se elimina, no se renombra a `_var` para silenciar el linter.
- Funciones cortas, una responsabilidad. Si un service crece, se parte en `services/`.
- Antes de resolver algo transversal (búsqueda de texto, acciones masivas, exportaciones, traducción de errores de Sequelize, gating por permisos), se busca si ya existe un mecanismo en `common/` y se usa ese. Los del proyecto están listados en [`rules.md`](./rules.md#mecanismos-compartidos-del-backend).

## Logs

Pino, con destino según `NODE_ENV`:

- `dev`: `pino-pretty` en la consola, nivel `debug`.
- `test`: JSON a un archivo, sin rotación.
- `prod`: JSON a la salida estándar (lo que lee el orquestador de contenedores) y a un directorio con `pino-roll` (rotación diaria o por tamaño, con retención acotada). Para que los archivos sobrevivan a los deploys, ese directorio se monta como volumen.

## Decisiones clave

- **UUIDs en todas las PKs y FKs.** Nunca `id: number`. Cada modelo declara sus columnas FK con `DataTypes.UUID`: como no hay `sync()`, Sequelize nunca infiere el tipo desde la asociación, así que no hace falta repetirlo en las asociaciones.
- **Soft delete con `isActive`** en las entidades principales: dar de baja no borra filas. Un borrado físico es una excepción explícita y documentada en [`rules.md`](./rules.md).
- **Slugs/codes auto-generados** desde el título con `slugify` para URLs amigables.
- **Variables de entorno** se cargan con `--env-file` (Node 22+) desde archivos `.env.<entorno>.local` que no se commitean, no con `dotenv`. Se exponen tipadas y validadas con Zod desde `common/config/`.
- **El esquema de la DB lo definen solo las migraciones**, no hay `sync()`. Cada FK declara su `ON DELETE` en la migración, igual al `onDelete` de su asociación.
- **Los modelos nunca se importan entre módulos**: se accede a los datos de otro módulo por su `service`. Regla y excepciones en [`context/modules.md`](./context/modules.md#comunicación-entre-módulos).
- **Toda lógica de cálculo vive en el backend** (derivados, estadísticas, agregaciones), en el serializer o el service. El frontend solo renderiza.
