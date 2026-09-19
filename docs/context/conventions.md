# Convenciones de código y trabajo

Reglas de estilo, naming y workflow. Aplican a todo el repo.

## Estilo de código

- **TypeScript estricto.** No usar `any` salvo último recurso documentado.
- **Tabs, no espacios** (lo enforce Prettier).
- **Strings con comillas dobles** (Prettier).
- **Imports relativos** entre módulos (`../games/games.service`).

## Nombres de archivos

- `<recurso>.model.ts` — modelo Sequelize.
- `<recurso>s.service.ts` — service (plural si el módulo trabaja con colección, singular si es uno).
- `<recurso>s.controller.ts` — controller.
- `<recurso>s.routes.ts` — router Express.
- `<recurso>s.serializer.ts` — serializer.
- `<accion>-<recurso>.schema.ts` — schema Zod (ej: `register-game.schema.ts`, `game-id-params.schema.ts`).
- `<accion>-<recurso>.dto.ts` — DTO (`z.infer<typeof Schema>`).
- `<modulo>.service-error.ts`, `<modulo>.domain-error.ts` — constructores de errores.
- `<modulo>.<algo>.mapper.ts` o `<modulo>.<algo>.normalizer.ts` — mappers/normalizers.

Si una categoría tiene **1 archivo**, queda en la raíz del módulo. Si tiene **2+**, se mueve a su carpeta (`schemas/`, `dtos/`, `errors/`, etc.). Detalle en [`modules.md`](./modules.md).

## Nombres en código

- **Variables y funciones:** `camelCase`.
- **Clases, tipos e interfaces:** `PascalCase` (sin prefijo `I`).
- **Constantes globales:** `SCREAMING_SNAKE_CASE`.
- **Funciones constructoras de errores:** `camelCase` descriptivo (`gameNotFound`, `uniqueConstraintError`).
- **Códigos de error:** `SCREAMING_SNAKE_CASE` con prefijo del módulo (`GAME_NOT_FOUND`, `AUTH_INVALID_CREDENTIALS`).

## DTOs

Aunque hoy son solo `z.infer<typeof Schema>`, **se mantienen en archivos separados**. Permite que el DTO evolucione sin tocar el schema (campos calculados, omitir campos internos). No es redundancia, es decisión de diseño.

```ts
// register-game.dto.ts
import { z } from "zod";
import { RegisterGameSchema } from "../schemas/register-game.schema";
export type RegisterGameDto = z.infer<typeof RegisterGameSchema>;
```

## Comentarios

**No se añaden comentarios.** El código tiene que ser autoexplicativo: nombres claros, funciones cortas, una responsabilidad por archivo. Si necesitas un comentario para entenderlo, antes intenta renombrar o partir la función.

Solo se permiten comentarios cuando es **estrictamente necesario** — casos donde el código no puede explicarse a sí mismo:

- Una regex no trivial (qué pretende matchear).
- Un workaround para un bug específico de una librería o servicio externo.
- Una restricción legal/externa que justifica una decisión que parece arbitraria.

No comentar lo que el nombre ya dice. No dejar referencias a tareas, issues o PRs en el código — eso va en el commit message.

## Commits

- **Conventional Commits** (`feat`, `fix`, `docs`, `chore`, `refactor`, `style`, `test`, `perf`, `build`, `ci`).
- **Una sola línea**, sin body, sin footer, sin firma de IA.
- **Imperativo, minúsculas, sin punto final.**
- **Granulares** — un cambio lógico por commit. Si el working tree mezcla cosas, se separan agrupando por archivo (no por hunk).

Detalle del flujo en `.claude/skills/commit/SKILL.md`.

## Post-edición obligatoria

Después de cualquier cambio de código, desde la raíz del repo:

1. `npm run lint:fix`
2. `npm run format`
3. `npm run typecheck` si tocaste tipos o interfaces del backend o la landing (corre también `astro check`); `npm test` si tocaste el frontend; `npm run build:landing` si tocaste la landing, porque valida el contenido de `src/content/` contra su schema.
4. Si modificaste o agregaste un endpoint → actualizar `docs/api/` (Bruno v3.1, formato `.yml`).
5. Si modificaste el schema de un modelo → crear migración Sequelize en `apps/api/migrations/`.
6. Si cambiaste un enum, un constraint, una validación o un auto-comportamiento → actualizar [`../invariants.md`](../invariants.md).
7. Si cambiaste un tope por rol, un permiso o qué se ve en público → **eso es una decisión de negocio, no un invariante**: se documenta en la planificación de producto, fuera de `docs/`.

Los pasos 6 y 7 no son opcionales. La documentación de este repo acumuló tres datos falsos (un estado del enum faltante, el modelo de privacidad entero y el nombre de un campo de respuesta) precisamente porque nadie los ejecutaba.

## Reglas de dominio aplicadas al código

- **Toda lógica de cálculo vive en backend.** Ratio, estadísticas, derivados, agregaciones — todo se calcula en el serializer o el service. El frontend solo renderiza.
- **`request.locals` es la única forma válida de leer datos validados** dentro del controller. `request.query` es inmutable en Express 5.
- **Nunca se importan modelos entre módulos.** Para acceder a datos de otro módulo, se importa su `service`. Detalle en [`modules.md`](./modules.md).
- **Excepción para tablas pivote** (`game-platform/`, `game-shelf/`, `list-items/`): pueden importar modelos para `include` de Sequelize, pero solo para asociaciones, no para CRUD.

## Sequelize includes con `attributes`

Los includes hacia modelos pesados (`Game` con `description` TEXT, `Backlog`, etc.) declaran whitelist de `attributes` en lugar de traer todo. Convención:

1. Constantes `XXX_ATTRS` al inicio del módulo, derivadas de lo que el serializer consume.
2. Reusarlas en cada `include`/`buildIncludes` del service.
3. Si dos serializers de un mismo módulo necesitan campos distintos, unificar en un set "razonable" que cubra ambos — no parametrizar el include.

```ts
const BACKLOG_GAME_ATTRS = ["id", "code", "title", "backgroundUrl", "isDlc"];
const BACKLOG_PLATFORM_ATTRS = ["id", "abbreviation"];

const backlogInclude = [
	{ model: Game, attributes: BACKLOG_GAME_ATTRS },
	{ model: Platform, attributes: BACKLOG_PLATFORM_ATTRS }
];
```

**Cuándo aplicar:** módulos con tablas grandes o columnas pesadas (`Game.description`, JSONB, futuros covers en múltiples sizes). Para tablas chicas y estables (`Platform`, `Genre`) es opcional pero recomendado por consistencia.

**Cuándo NO:** cuando el modelo es la raíz de la query (`Game.findOne(...)` sin include) y el serializer usa muchos campos — no vale la pena enumerar 15 columnas.

## Filosofía Clean Code aplicada al repo

- **No agregar features, refactors ni abstracciones más allá del task.** Tres líneas similares es mejor que una abstracción prematura.
- **No agregar manejo de errores defensivo para casos que no pueden ocurrir.** Validar solo en bordes (input de usuario, APIs externas).
- **No dejar implementaciones a medias.** Si no compila o no funciona, no se commitea.
- **No agregar shims de retrocompatibilidad** cuando puedes cambiar el código.
- **No renombrar variables a `_var` para silenciar warnings** — si no se usa, se elimina.
- **Funciones cortas, una responsabilidad.** Si un service crece, se parte en `services/` (ver `auth/services/password.service.ts` + `token.service.ts`).

## Cuándo preguntar antes de actuar

Aunque el repo es de un solo developer, hay acciones que requieren confirmación explícita:

- **Cambios en modelos / DB.** Nunca cambiar columnas, tipos o asociaciones sin preguntar primero (auto-restart propaga el cambio inmediatamente).
- **Commits y pushes.** No commitear ni pushear automáticamente — esperar instrucción.
- **Operaciones destructivas** (borrar archivos, `git reset --hard`, `rm -rf`, drops de tablas).
