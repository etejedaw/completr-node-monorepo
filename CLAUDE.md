# Completr

Monorepo de Completr: backend (Node + Express + Sequelize + PostgreSQL) en `apps/api` y frontend (Angular) en `apps/web`. Completr es un gestor de backlog de videojuegos tipo Trakt que prioriza qué jugar mediante un ratio puntuación/duración. AGPLv3, desarrollo iterativo.

## Fuente de verdad

Los documentos del proyecto viven en AFFiNE, workspace `b48542ca-7422-4505-a933-3640ba923c2d`, carpeta `Completr`:

| Doc                 | docId                   | Qué contiene                                                                |
| ------------------- | ----------------------- | --------------------------------------------------------------------------- |
| Context             | `JYN5z0t8Zy`            | Visión, cronología de fases, decisiones y supuestos                         |
| Reglas de negocio   | `xruqTLlMPw`            | Estados del backlog, ratio, privacidad, semestres                           |
| Premium             | `XraQg_c8i0`            | Roles y permisos, límites free vs. premium, gating                          |
| Deuda técnica       | `3kQdzgm3Yb`            | Pendientes técnicos abiertos y qué falta para cerrarlos                     |
| Trabajo por feature | `LVVa6VxU4ykwvbn-srApV` | Flujo de trabajo de cada ítem: propuestas, implementación, pruebas y commit |

### Roadmap (carpeta `Completr/Roadmap`)

| Doc      | docId                   | Qué contiene                                                 |
| -------- | ----------------------- | ------------------------------------------------------------ |
| Fase 0   | `6CRhBgO0eO1FPwcA1NKLo` | Diseño y setup: base técnica y arquitectura                  |
| Fase 1   | `MqWcRvR3JMcgZ2KoWjxPx` | Excel Killer: import, ratios, filtros por status y semestre  |
| Fase 1.5 | `CG59mk4mMRGr1-0QeCQHP` | Beyond the Spreadsheet: vistas, filtros avanzados, deploy    |
| Fase 2   | `NFxL6wwjgueRhnWam7p8B` | MVP Amigos: cuentas, import y visibilidad mutua              |
| Fase 2.5 | `tLKKDQTK8jROxM25JuChI` | Pulido y UX: bugs de Fase 2, base de componentes UI          |
| Fase 3   | `lJy0Fo_sbImOrriFjU2At` | Beta cerrada — **cerrada** (2026-07-04), queda como registro |
| Fase 4   | `g18aJrTWDtGJWAnJfQabH` | Lote de features independiente de usuarios (fase activa)     |
| Fase 5   | `4NWWL6zfUKvqbu7KDhqQs` | Estabilización y calidad según feedback de beta              |
| Fase 5.5 | `48WMZc27S0w-kygxFr1Kx` | Cumplimiento legal de fuentes externas, pre-Premium          |
| Fase 6   | `VmxX4pwLZzGscQmMTzix3` | Construcción y lanzamiento de Premium                        |
| Fase 7   | `LgBAmwBIXgxYr4raLjdF0` | Escalamiento continuo: retención, engagement, expansión      |

### Feedback (carpeta `Completr/Feedback`)

| Doc     | docId        | Qué contiene                                                 |
| ------- | ------------ | ------------------------------------------------------------ |
| CONTEXT | `mvb07iftyW` | Convenciones de formato, IDs (FB-XXX), estados y severidades |
| fase-2  | `euAngKluAU` | Feedback de usuarios de Fase 2 + 2.5                         |
| fase-3  | `Po8jKhI6DJ` | Feedback de usuarios y beta testers de Fase 3                |

Lee `Trabajo por feature` antes de empezar un ítem de una fase. Lee `Context` con `mcp__affine__export_doc_markdown` antes de empezar una fase nueva, al diseñar modelos o endpoints, o cuando la tarea toque decisiones de producto. Lee el doc de la fase que estés trabajando para saber el estado real de cada ítem; `Reglas de negocio` cuando toques estados, ratio o privacidad; `Premium` cuando toques gating o límites; `Feedback` cuando trabajes un FB-XXX. Para un fix puntual basta con el doc de la fase.

**Si cambia una decisión de producto o de negocio, actualiza el doc en AFFiNE** — con `mcp__affine__update_block` sobre el bloque puntual, no reescribiendo el documento.

Al completar ítems de una fase, márcalos ahí (`update_block` con `checked`).

## Monorepo

npm workspaces. Cada app tiene su `package.json`; el lockfile, el tooling (ESLint, Prettier, Husky, lint-staged) y la versión del producto viven en la raíz.

| Carpeta                | Qué contiene                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `apps/api`             | Backend, migraciones, scripts, `docker-compose.yml` de desarrollo |
| `apps/web`             | Frontend Angular, config de nginx                                 |
| `docs/`                | Documentación técnica de las dos apps y el changelog único        |
| `.claude/skills/`      | Skills del proyecto                                               |
| `captain-definition-*` | Deploy de cada app; el contexto de build de Docker es la raíz     |

Comandos desde la raíz: `npm run dev` (API + web), `dev:api`, `dev:web`, `db` / `db:down`, `build`, `typecheck`, `test`, `lint`, `lint:fix`, `format`, `migrate`, `migrate:status`. Cualquier otro script de una app: `npm run <script> -w apps/<app>`. Las dependencias se instalan con `npm install <pkg> -w apps/<app>`, nunca con `npm install` dentro de la carpeta de la app.

## Lo técnico vive en `docs/`

AFFiNE tiene el negocio y la planificación. Todo lo técnico vive en el repo, y es lectura obligatoria antes de proponer cambios, no después:

| Archivo                       | Qué contiene                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `docs/architecture.md`        | Stack, capas, flujo de un request, decisiones de diseño                         |
| `docs/invariants.md`          | Enums, constraints, validaciones, códigos de error, auto-comportamientos        |
| `docs/context/modules.md`     | Anatomía de un módulo y comunicación entre módulos                              |
| `docs/context/conventions.md` | Estilo, nombres, commits, post-edición obligatoria                              |
| `docs/context/errors.md`      | Sistema de errores en 3 capas (obligatorio si tocas errores)                    |
| `docs/context/providers.md`   | Adapters de integraciones externas (obligatorio si tocas providers)             |
| `docs/context/frontend.md`    | Stack, estructura y convenciones del frontend (obligatorio si tocas `apps/web`) |
| `docs/api/`                   | Colección Bruno con todos los endpoints                                         |

**La frontera:** `docs/` describe el mecanismo (cómo se llama el enum, qué constraint existe, qué status devuelve la API). AFFiNE tiene la decisión (cuál es el límite de un free, qué significa cada estado, por qué existe el ratio). Un dato tiene un solo dueño: no lo dupliques en el otro lado.

**Este archivo es el único del repo que puede mencionar AFFiNE.** El repo es AGPLv3: quien lo forkee no debe encontrar referencias a un workspace privado al que no tiene acceso. `README.md`, `docs/` y `docs/changelogs/` se escriben autocontenidos — cuando una decisión vive fuera del repo, se dice "es planificación de producto y no se documenta acá", sin nombrar la herramienta ni el doc. Si el dato existe en el código (un `FREE_*_LIMIT`, un `authMiddleware`), apunta al código, que además no se desfasa.
