# Módulos

Cada módulo de negocio en `apps/api/src/` sigue la misma estructura. Este archivo es la referencia para crear uno nuevo o modificar uno existente; las reglas de código que valen para todo el backend están en [`../architecture.md`](../architecture.md#cómo-se-escribe-el-código).

## Estructura de un módulo

Ejemplo completo (`games/`):

```
apps/api/src/games/
├── game.model.ts                  Modelo Sequelize
├── games.service.ts               Lógica de negocio + queries
├── games.controller.ts            Handlers de request/response
├── games.routes.ts                Router Express
├── games.serializer.ts            Transformación al formato del frontend
├── games.interface.ts             Interfaces del módulo
├── games.types.ts                 Alias type del módulo
├── dtos/                          DTOs (z.infer<typeof Schema>)
│   ├── register-game.dto.ts
│   └── update-game.dto.ts
├── schemas/                       Schemas Zod (body, params, query)
│   ├── register-game.schema.ts
│   ├── update-game.schema.ts
│   ├── game-code-params.schema.ts
│   ├── game-id-params.schema.ts
│   └── games-query.schema.ts
├── mappers/                       Conversión entre representaciones (ej: rawg-to-game)
│   ├── rawg-to-game.mapper.ts
│   ├── rawg-genre.map.ts
│   └── rawg-platform.map.ts
└── errors/                        Errores del módulo (ver context/errors.md)
    ├── games.service-error.ts
    ├── games.domain-error.ts
    ├── games.service-to-domain.mapper.ts
    ├── games.domain-to-http.mapper.ts
    └── games.error-domain.normalizer.ts
```

## Nombres de archivo

| Archivo                                                                   | Qué es                                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `<recurso>.model.ts`                                                      | Modelo Sequelize                                                   |
| `<recurso>s.service.ts`, `.controller.ts`, `.routes.ts`, `.serializer.ts` | Plural si el módulo trabaja con una colección, singular si es uno  |
| `<accion>-<recurso>.schema.ts`, `<recurso>-<parte>-params.schema.ts`      | Schema Zod (`register-game.schema.ts`, `game-id-params.schema.ts`) |
| `<accion>-<recurso>.dto.ts`                                               | DTO de un body                                                     |
| `<modulo>.service-error.ts`, `<modulo>.domain-error.ts`                   | Constructores de errores (ver [`errors.md`](./errors.md))          |
| `<modulo>.<algo>.mapper.ts`, `<modulo>.<algo>.normalizer.ts`              | Mappers y normalizers                                              |
| `<modulo>.interface.ts`, `<modulo>.types.ts`                              | Interfaces y alias `type` del módulo                               |
| `<modulo>.constants.ts`                                                   | Constantes en tiempo de ejecución                                  |
| `<nombre>.util.ts`, `<nombre>.helper.ts`                                  | Una función pura por archivo (`is-step-of-half.util.ts`)           |

## Regla de carpetas: 1 → raíz, 2+ → subcarpeta

Si una categoría tiene **un solo archivo**, queda en la raíz del módulo. Si tiene **dos o más**, se mueve a su propia carpeta.

Categorías que aplican esta regla: `dtos/`, `schemas/`, `errors/`, `serializers/`, `mappers/`, `utils/`, `helpers/`, `services/`.

Ejemplo simple — `genres/` con un solo DTO:

```
apps/api/src/genres/
├── genres.model.ts
├── genres.service.ts
├── genres.controller.ts
├── genres.routes.ts
├── register-genre.dto.ts          ← un solo DTO, queda en raíz
├── schemas/
└── errors/
```

## Responsabilidades por archivo

### `model.ts`

- Define la tabla con Sequelize.
- Atributos, validaciones a nivel DB, asociaciones (en `database/associations.database.ts`).
- **No tiene lógica de negocio.**
- PK siempre UUID.

### `service.ts`

- Capa de aplicación. Habla con el `Model`.
- Funciones nombradas (no clases) exportadas como `export async function findGameById(...)`.
- **Lanza `ServiceError`, nunca `DomainError`.** Puede retornar `null` para "no encontrado" cuando el controller es quien decide si eso es error o no.
- **Para acceder a otro módulo, importa su `service`** (ver "Comunicación entre módulos" abajo).
- Los `include` hacia modelos pesados (`Game` con `description` TEXT, `Backlog`, JSONB) declaran una whitelist de `attributes` en constantes `XXX_ATTRS` al inicio del módulo, derivadas de lo que consume el serializer y reutilizadas en cada `include`. Si dos serializers del módulo necesitan campos distintos, se unifica en un set que cubra ambos en vez de parametrizar el include. No hace falta cuando el modelo es la raíz de la query y el serializer usa casi todas sus columnas.

```ts
const BACKLOG_GAME_ATTRS = ["id", "code", "title", "backgroundUrl", "isDlc"];
const BACKLOG_PLATFORM_ATTRS = ["id", "abbreviation"];

const backlogInclude = [
	{ model: Game, attributes: BACKLOG_GAME_ATTRS },
	{ model: Platform, attributes: BACKLOG_PLATFORM_ATTRS }
];
```

### `controller.ts`

- Handlers de Express. Lee de `request.locals` (no de `request.body/query/params`).
- `request.locals.body`, `params` y `query` se castean al tipo inferido del schema que valida esa ruta en `routes.ts`: el DTO para el body (`as RegisterGameDto`) y el tipo exportado por el schema para params y query (`as GameIdParam`, `as GamesQuery`). Nunca a un objeto escrito a mano (`as { limit?: number }`), a una intersección (`as GameIdParam & { listId: string }`) ni a un alias `z.infer` declarado en el controller: si el schema existe, su tipo se exporta y se importa; si no existe, se crea.
- Orquesta llamadas a uno o más services.
- **Lanza `DomainError`** ante reglas de negocio violadas.
- Llama al `serializer` y responde con `{ data: ... }`.
- **No contiene queries a DB ni lógica compleja** — eso vive en services.

### `routes.ts`

- Define los endpoints Express.
- Cada ruta declara sus middlewares en el orden del [flujo de un request](../architecture.md#flujo-de-un-request).
- Exporta el `router` como default.

### `serializer.ts`

- Función pura: recibe el `model.get({ plain: true })` y retorna el shape final del frontend.
- **Aquí van los cálculos derivados** (ratio, estadísticas, banderas booleanas).
- Si hay variantes de salida (tiny, full), se hacen archivos separados en `serializers/`.

### `<modulo>.interface.ts` y `<modulo>.types.ts`

- Toda declaración `interface` del módulo, exportada o de uso interno, vive en `<modulo>.interface.ts`; todo alias `type` (objetos, uniones, intersecciones, utilitarios, firmas de función), en `<modulo>.types.ts`. Nunca se declaran en services, controllers, routes, serializers, mappers, utils, helpers, templates, constants, errors ni middlewares.
- Un `*.interface.ts` solo contiene interfaces y un `*.types.ts` solo alias `type`. Las constantes en tiempo de ejecución van a `<modulo>.constants.ts`, aunque solo existan para derivar un tipo.
- Si mezclarlo con el contrato HTTP lo ensucia, el módulo separa sus tipos por tema: `<modulo>-<tema>.interface.ts` y `<modulo>-<tema>.types.ts` (por ejemplo `rewind-run.interface.ts`, `rewind-build.interface.ts`, `rewind-generation.types.ts`). En `common/`, las interfaces van en `common/interfaces/` o en un `*.interface.ts` junto a su carpeta (`common/errors/errors.interface.ts`), y los alias en `common/types/`.
- Los tipos se exportan siempre desde su archivo y se importan con `import { type X }`.
- **Excepciones**, que se quedan donde están: el tipo derivado de una constante en tiempo de ejecución, junto a ella (`type X = (typeof X_VALUES)[number]`, `keyof typeof X`, `ExportRow<(typeof COLUMNS)[number]>`); el `z.infer<typeof Schema>` junto a su schema o en su DTO, y los DTOs en general, que son su propio archivo de tipos; lo que un modelo Sequelize necesita para declarar su clase (atributos, `InferAttributes`, la forma de sus includes); los `*.d.ts` de augmentations.

### `dtos/`

- Tipo del body de un request, inferido de su schema Zod: `export type RegisterGameDto = z.infer<typeof RegisterGameSchema>`.
- Siempre con sufijo `Dto`, y solo para bodies: params, query y headers no llevan DTO.
- Un archivo por DTO aunque hoy sean solo un `z.infer`: así el DTO puede evolucionar (campos calculados, omitir campos internos) sin tocar el schema. No es redundancia, es una decisión de diseño.

### `schemas/`

- Schemas Zod para validar `body`, `params`, `query` o `headers`.
- Un archivo por schema.
- Nombrado: `<accion>-<recurso>.schema.ts` o `<recurso>-<parte>-params.schema.ts`.
- Los schemas de `params`, `query` y `headers` exportan su tipo en el mismo archivo, debajo del schema: `export type GameIdParam = z.infer<typeof GameIdParamSchema>`. Los de `body` no exportan tipo: el suyo es el DTO.

### `errors/`

Ver [`errors.md`](./errors.md) — sistema completo de errores.

### `mappers/`, `utils/` y `helpers/`

- `mappers/`: conversiones entre representaciones que no son errores (`rawg-to-game.mapper.ts` convierte la respuesta de RAWG a la forma del modelo `Game`).
- `utils/` y `helpers/`: funciones puras del módulo que no encajan en service ni controller, una por archivo.

## Comunicación entre módulos

**Regla central:** los modelos nunca se importan entre módulos. Para acceder a datos de otro módulo, se importa su `service`.

```ts
// games.controller.ts — CORRECTO
import * as listsService from "../lists/lists.service";
import * as backlogService from "../backlog/backlog.service";

const lists = await listsService.findListsContainingGame(gameId);
```

```ts
// games.controller.ts — PROHIBIDO
import { List } from "../lists/list.model"; // ✗ no
import { Backlog } from "../backlog/backlog.model"; // ✗ no
```

**Por qué:** cada módulo es dueño de su modelo. Si otro lo importa directamente, el dueño ya no controla cómo se accede a sus datos, y cambiar el schema obliga a modificar consumidores remotos.

### Excepción: tablas pivote

La excepción es una lista cerrada, no un criterio abierto. Los únicos módulos pivote que pueden importar **modelos** de otros módulos son `game-platform/`, `game-genre/`, `game-shelf/`, `list-items/`, `game-reports/`, `user-followers/`, `user-follow-requests/` y `list-followers/`, y solo cuando los necesitan para asociaciones, `include` y `order` de Sequelize:

```ts
// game-shelf.service.ts — válido
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";

const shelf = await GameShelf.findAll({
	include: [{ model: Game }, { model: Platform }]
});
```

Pero **solo para `include`, asociaciones y `order`**. Nunca para CRUD (`find*`, `count`, `create`, `update`, `destroy`, `bulkCreate`) sobre el modelo ajeno: para eso, los pivotes también importan el service respectivo (`gamesService`, `platformsService`, `usersService`, `listsService`). Un módulo que no esté en la lista no tiene esta excepción, aunque sea una tabla de relación; si necesita una, se añade a la lista en este archivo.

## Cómo crear un módulo nuevo

1. Crear la carpeta `apps/api/src/<nombre>/`.
2. Crear `<recurso>.model.ts` con el modelo Sequelize (PK UUID, soft delete si aplica).
3. Registrar el modelo en `apps/api/src/database/init.database.ts` y sus asociaciones en `apps/api/src/database/associations.database.ts`.
4. Crear la migración Sequelize en `apps/api/migrations/`. Cada FK lleva en la migración el mismo `ON DELETE` que declara su asociación.
5. Crear `<modulo>.service.ts` con funciones que lancen `ServiceError`.
6. Crear los errores del módulo en `errors/` siguiendo [`errors.md`](./errors.md).
7. Registrar el normalizer y el mapper del módulo en `apps/api/src/common/errors/global-error-domain.normalizer.ts` y `global-error-http.normalizer.ts`.
8. Crear schemas Zod en `schemas/` y sus DTOs en `dtos/`.
9. Crear `<modulo>.controller.ts` y `<modulo>.serializer.ts`.
10. Crear `<modulo>.routes.ts` con middlewares.
11. Registrar el router en `apps/api/src/server.ts`.
12. Documentar los endpoints en `docs/api/<modulo>/` (Bruno v3.1).
13. Si el modelo guarda datos de un usuario, cumplir lo que exige el [borrado de cuenta](../invariants.md#borrado-de-cuenta) (FK con `ON DELETE CASCADE` o `SET NULL`) y exponer un `find<Recurso>ForDataExport(userId)` que se sume a `collectPersonalData()` de `data-requests/services/personal-data-export.service.ts` y a su serializer, para que el export de datos personales siga completo. Si además apunta a `Games`, sumarlo a la comprobación de uso del borrado físico de juegos (ver [`invariants.md`](../invariants.md#scores-y-duraciones)).
