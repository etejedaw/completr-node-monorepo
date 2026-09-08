# Completr

Backend de Completr (Node + Express + Sequelize + PostgreSQL), un gestor de backlog de videojuegos tipo Trakt que prioriza qué jugar mediante un ratio puntuación/duración. AGPLv3, desarrollo iterativo.

## Fuente de verdad

Los documentos del proyecto viven en AFFiNE, workspace `b48542ca-7422-4505-a933-3640ba923c2d`, carpeta `Completr`:

| Doc               | docId        | Qué contiene                                        |
| ----------------- | ------------ | --------------------------------------------------- |
| Context           | `JYN5z0t8Zy` | Visión, cronología de fases, decisiones y supuestos |
| Reglas de negocio | `xruqTLlMPw` | Estados del backlog, ratio, privacidad, semestres   |
| Premium           | `XraQg_c8i0` | Roles y permisos, límites free vs. premium, gating  |

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

Lee `Context` con `mcp__affine__export_doc_markdown` antes de empezar una fase nueva, al diseñar modelos o endpoints, o cuando la tarea toque decisiones de producto. Lee el doc de la fase que estés trabajando para saber el estado real de cada ítem; `Reglas de negocio` cuando toques estados, ratio o privacidad; `Premium` cuando toques gating o límites; `Feedback` cuando trabajes un FB-XXX. Para un fix puntual basta con el doc de la fase.

**Si cambia una decisión de producto o de negocio, actualiza el doc en AFFiNE** — con `mcp__affine__update_block` sobre el bloque puntual, no reescribiendo el documento.

Al completar ítems de una fase, márcalos ahí (`update_block` con `checked`).

## Lo técnico vive en `docs/`

AFFiNE tiene el negocio y la planificación. Todo lo técnico vive en el repo, y es lectura obligatoria antes de proponer cambios, no después:

| Archivo                       | Qué contiene                                                             |
| ----------------------------- | ------------------------------------------------------------------------ |
| `docs/architecture.md`        | Stack, capas, flujo de un request, decisiones de diseño                  |
| `docs/invariants.md`          | Enums, constraints, validaciones, códigos de error, auto-comportamientos |
| `docs/context/modules.md`     | Anatomía de un módulo y comunicación entre módulos                       |
| `docs/context/conventions.md` | Estilo, nombres, commits, post-edición obligatoria                       |
| `docs/context/errors.md`      | Sistema de errores en 3 capas (obligatorio si tocas errores)             |
| `docs/context/providers.md`   | Adapters de integraciones externas (obligatorio si tocas providers)      |
| `docs/api/`                   | Colección Bruno con todos los endpoints                                  |

**La frontera:** `docs/` describe el mecanismo (cómo se llama el enum, qué constraint existe, qué status devuelve la API). AFFiNE tiene la decisión (cuál es el límite de un free, qué significa cada estado, por qué existe el ratio). Un dato tiene un solo dueño: no lo dupliques en el otro lado.
