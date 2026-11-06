# Flujo de trabajo

Ramas, commits, tests, qué hacer después de editar y cuándo preguntar. Aplica a las tres apps. Cómo se escribe el código está en [`../architecture.md`](../architecture.md#cómo-se-escribe-el-código).

## Ramas

- **Todo cambio de código se hace en `develop`.** Nunca editar ni commitear directo en `main`, que solo recibe merges desde `develop` para pasar a productivo. Antes de editar se verifica la rama con `git branch --show-current`.
- **Historia lineal en `develop`.** Una rama de trabajo se integra con rebase sobre `develop` y avance rápido (`git merge --ff-only <rama>`), sin commits de merge. Solo el paso de `develop` a `main` es un merge.
- **Trabajo en paralelo con worktrees.** Viven en `.worktree/<bloque>`, uno por bloque y con su propia rama (están en `.gitignore` y ESLint los ignora). Cada bloque toca archivos distintos. Las ramas de los bloques se integran una a una con rebase en una rama de integración, y esa rama entra a `develop` de la misma forma.

## Scripts y CLIs antes que edición a mano

Si existe un script del `package.json` o un CLI que hace la tarea, se usa ese en vez de escribir el resultado a mano. El script sabe lo que una edición manual olvida: el timestamp de una migración, la versión resuelta y el lockfile de una dependencia, los archivos y registros que genera un CLI.

- Las dependencias se instalan con `npm install <pkg> -w apps/<app>` desde la raíz, nunca editando un `package.json` ni con `npm install` dentro de la carpeta de la app.
- Las migraciones se crean con el script `migrate:create` de `apps/api`.
- Lo que un CLI genera (componentes de Angular, configuración de una herramienta) se crea con ese CLI y después se ajusta.
- Antes de escribir un comando propio, revisar los scripts del `package.json` de la raíz y de la app: si ya hay uno, se usa ese.

## Commits

- **Conventional Commits** (`feat`, `fix`, `docs`, `chore`, `refactor`, `style`, `test`, `perf`, `build`, `ci`), en una sola línea, imperativo, minúsculas y sin punto final.
- **Sin firma de IA en nada**: ni `Co-Authored-By` ni "Generated with" en commits, merges, migraciones o PRs.
- **Granulares**: un cambio lógico por commit. Si el working tree mezcla cosas, se separan agrupando por archivo, no por hunk.

Detalle del flujo en `.claude/skills/git-commit/SKILL.md`.

## Tests

- **No hay tests intermitentes.** Un test que falla en una corrida y pasa en otra es un bug, del código o del test. Se busca su causa (estado compartido entre tests, timers vivos tras destruir un servicio, elementos que quedan en el DOM, dos registros con el mismo `createdAt`, orden sin desempate por id) y se corrige; no se da por bueno porque pasa al repetirlo, aislado o en otra máquina. Un cambio que toque la suite se valida con 3 corridas seguidas sin fallos.
- **Un bug encontrado por un test** se deja marcado (`{ todo: "..." }` en la API, `it.todo("...")` en la web) hasta que se corrija; no se arregla dentro del cambio que escribe los tests.

Los tests del frontend están en [`frontend.md`](./frontend.md#tests).

### Tests de la API

Viven en `apps/api/test/`, con la misma estructura modular que `src/`. Corren con `node:test` y TypeScript vía `-r ts-node/register`; los de integración usan `supertest` contra `createApp()` sin levantar un puerto.

| Archivo                                      | Qué es                                        |
| -------------------------------------------- | --------------------------------------------- |
| `test/<modulo>/<modulo>.integration.test.ts` | Integración HTTP contra la DB de test         |
| `test/<modulo>/<archivo>.unit.test.ts`       | Unitarios, sin DB                             |
| `test/helpers/`                              | Cliente supertest, truncado, factories, login |
| `test/global-setup.mjs`                      | Aplica las migraciones a la DB de test        |

Los scripts de test fijan `NODE_ENV=test` y cargan `apps/api/.env.test.local` si existe. Los tests entran en `tsconfig.json` pero no en `tsconfig.build.json`.

- **DB de test:** un servicio Postgres propio en el `docker-compose.yml` de desarrollo, en otro puerto que la DB de desarrollo, para que correr la suite no toque datos de trabajo. Los valores por defecto de conexión con `NODE_ENV=test` apuntan a ese servicio; un puerto local distinto va en `.env.test.local`, que no se commitea.
- **Migraciones:** el global setup de los tests de integración aplica las migraciones antes de cada corrida. Los unitarios no tocan la DB.
- **Aislamiento:** cada archivo de test corre en su propio proceso y trunca todas las tablas salvo `SequelizeMeta` antes de empezar. Dentro de un archivo los datos se comparten, así que las factories generan valores únicos (usernames, emails). Los de integración corren con `--test-concurrency=1` porque comparten DB. El truncado también vacía los catálogos sembrados por migración: el test que los necesita los crea con factories en el setup del archivo, porque los `before` de nivel raíz corren en paralelo y no sirven para eso.
- **Entorno `test`:** el rate limiter queda desactivado, las esperas y enfriamientos de los providers se anulan y los servicios externos se reemplazan por modelos en memoria inspeccionables (por ejemplo, el correo va a un `outbox` en memoria, no a SMTP).

## Post-edición obligatoria

El hook de pre-commit aplica lint y formato a lo que está en stage y corre el typecheck de las tres apps (en la web con `ngc --noEmit`, que revisa también las plantillas, y en la landing con `astro check`); si falla, el commit no se crea. Después de cualquier cambio de código:

1. Correr los tests de la app que tocaste. Si tocaste el contenido de la landing, hacer su build, que valida `src/content/` contra su schema.
2. Si modificaste o agregaste un endpoint → actualizar `docs/api/` (Bruno v3.1, formato `.yml`).
3. Si modificaste el schema de un modelo o una asociación → crear la migración Sequelize en `apps/api/migrations/`.
4. Si agregaste o cambiaste una regla que el código hace cumplir y cuyo porqué no se ve leyéndolo (privacidad, concurrencia, límites de un servicio externo, datos que no se borran) → actualizar [`../rules.md`](../rules.md) con la regla y su razón.
5. Si cambiaste un tope por rol, un permiso o qué se ve en público → eso es una decisión de negocio: se documenta en la planificación de producto, fuera de `docs/`.

El changelog (`docs/changelogs/` y, si el usuario nota el cambio, la entrada pública de la landing) se escribe una vez al cerrar la tanda de trabajo, no por cada cambio. El proceso está en `.claude/skills/release-changelog/SKILL.md` (técnico) y `.claude/skills/release-changelog-public/SKILL.md` (público).

## Cuándo preguntar antes de actuar

- **Pedir que se lea, revise o prepare algo no autoriza a editar código.** Se resume, se propone y se espera la orden.
- **Cambios en modelos o en la DB.** Nunca cambiar columnas, tipos o asociaciones sin preguntar primero (el auto-restart propaga el cambio de inmediato). Tampoco ejecutar migraciones ni modificar datos sin preguntar.
- **Commits y pushes.** No se commitea ni se pushea sin instrucción.
- **Operaciones destructivas** (borrar archivos, `git reset --hard`, `rm -rf`, drops de tablas).
