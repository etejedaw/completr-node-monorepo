# Módulos

Cada módulo de negocio en `apps/api/src/` sigue la misma estructura. Este archivo es la referencia para crear uno nuevo o modificar uno existente.

## Estructura de un módulo

Ejemplo completo (`games/`):

```
apps/api/src/games/
├── game.model.ts                  Modelo Sequelize
├── games.service.ts               Lógica de negocio + queries
├── games.controller.ts            Handlers de request/response
├── games.routes.ts                Router Express
├── games.serializer.ts            Transformación al formato del frontend
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
- **Lanza `ServiceError`** ante fallos técnicos o de negocio detectados aquí.
- **Nunca lanza `DomainError`.**
- Puede retornar `null` para "no encontrado" cuando el controller es quien decide si eso es error o no.
- **Para acceder a otro módulo, importa su `service`** (ver "Comunicación entre módulos" abajo).

### `controller.ts`

- Handlers de Express. Lee de `request.locals` (no de `request.body/query/params`).
- Orquesta llamadas a uno o más services.
- **Lanza `DomainError`** ante reglas de negocio violadas.
- Llama al `serializer` y responde con `{ data: ... }`.
- **No contiene queries a DB ni lógica compleja** — eso vive en services.

### `routes.ts`

- Define los endpoints Express.
- Cada ruta declara middlewares en este orden: `authMiddleware` → `rateLimiterMiddleware` → `validateSchemaMiddleware`.
- Exporta el `router` como default.

### `serializer.ts`

- Función pura: recibe el `model.get({ plain: true })` y retorna el shape final del frontend.
- **Aquí van los cálculos derivados** (ratio, estadísticas, banderas booleanas).
- Si hay variantes de salida (tiny, full), se hacen archivos separados en `serializers/`.

### `dtos/`

- Tipos inferidos del schema Zod: `export type RegisterGameDto = z.infer<typeof RegisterGameSchema>`.
- Un archivo por DTO aunque sean triviales — permite evolucionarlos sin tocar el schema.

### `schemas/`

- Schemas Zod para validar `body`, `params`, `query` o `headers`.
- Un archivo por schema.
- Nombrado: `<accion>-<recurso>.schema.ts` o `<recurso>-<parte>-params.schema.ts`.

### `errors/`

Ver [`errors.md`](./errors.md) — sistema completo de errores.

### `mappers/`

- Conversiones entre representaciones que no son errores (ej: `rawg-to-game.mapper.ts` convierte respuesta del provider RAWG a forma del modelo `Game`).
- Si hay solo uno, queda en la raíz del módulo.

### `utils/` y `helpers/`

- Funciones puras específicas del módulo que no encajan en service ni controller.
- Una función por archivo: `is-step-of-half.util.ts`, `refresh-cookie.util.ts`.

### `services/` (subcarpeta)

- Solo si el módulo tiene **múltiples services**. Ejemplo: `auth/services/password.service.ts` + `auth/services/token.service.ts`.
- Si hay un solo service, queda como `<modulo>.service.ts` en la raíz.

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

**Por qué:** cada módulo es dueño de su modelo. Si otro módulo importa el modelo directamente, se rompe la encapsulación — el dueño ya no controla cómo se accede a sus datos, y refactorizar el schema implica modificar consumidores remotos.

### Excepción: tablas pivote

Los módulos pivote (`game-platform/`, `game-shelf/`, `list-items/`, etc.) pueden importar **modelos** de otros módulos cuando los necesitan para asociaciones e `include` de Sequelize:

```ts
// game-shelf.service.ts — válido
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";

const shelf = await GameShelf.findAll({
	include: [{ model: Game }, { model: Platform }]
});
```

Pero **solo para asociaciones e includes**. Para CRUD de Game o Platform, siguen importando el service respectivo.

## Cómo crear un módulo nuevo

1. Crear la carpeta `apps/api/src/<nombre>/`.
2. Crear `<recurso>.model.ts` con el modelo Sequelize (PK UUID, soft delete si aplica).
3. Registrar el modelo en `apps/api/src/database/init.database.ts` y sus asociaciones en `apps/api/src/database/associations.database.ts`.
4. Crear migración Sequelize en `apps/api/migrations/` con `npm run migrate:create -w apps/api -- <nombre>`.
5. Crear `<modulo>.service.ts` con funciones que lancen `ServiceError`.
6. Crear los errores del módulo en `errors/` siguiendo [`errors.md`](./errors.md).
7. Registrar el normalizer y el mapper del módulo en `apps/api/src/common/errors/global-error-domain.normalizer.ts` y `global-error-http.normalizer.ts`.
8. Crear schemas Zod en `schemas/` y sus DTOs en `dtos/`.
9. Crear `<modulo>.controller.ts` y `<modulo>.serializer.ts`.
10. Crear `<modulo>.routes.ts` con middlewares.
11. Registrar el router en `apps/api/src/server.ts`.
12. Documentar los endpoints en `docs/api/<modulo>/` (Bruno v3.1).
