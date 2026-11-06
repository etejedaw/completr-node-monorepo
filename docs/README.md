# Documentación

Punto de entrada para entender cómo está organizado el código de Completr: backend en `apps/api`, frontend en `apps/web` y landing en `apps/landing`. Cada archivo cubre un tema concreto — si tienes una duda, este índice te dice a dónde ir.

## Índice

### Arquitectura general

- [`architecture.md`](./architecture.md) — Estándares portables del backend: estructura del monorepo, stack, capas, flujo de un request, reglas de escritura de código y decisiones de diseño. No depende de las features del proyecto. **Empieza aquí si nunca has visto el proyecto.**

### Reglas

- [`rules.md`](./rules.md) — Todo lo propio de Completr que no se lee en el código: reglas con su razón (privacidad, concurrencia, datos externos, borrado de cuenta), infraestructura, integraciones concretas, mecanismos compartidos y el catálogo de la interfaz.

### Estándares por subsistema (`context/`)

Como `architecture.md`, son portables: sirven tal cual en otro proyecto con el mismo stack.

- [`context/conventions.md`](./context/conventions.md) — Flujo de trabajo: ramas, commits, tests, qué hacer después de editar y cuándo preguntar.
- [`context/modules.md`](./context/modules.md) — Anatomía de un módulo de negocio. Qué archivos lleva y cómo se nombran, cuándo se crean carpetas, cómo se conectan los módulos entre sí y por qué nunca se importa el `Model` de otro módulo directamente.
- [`context/errors.md`](./context/errors.md) — Sistema de errores en 3 capas (`ServiceError` → `DomainError` → `HttpError`), quién lanza qué, los mappers y normalizers globales, y cómo agregar un error nuevo.
- [`context/providers.md`](./context/providers.md) — Adapters para integraciones externas (HTTP APIs, scrapers, IA, mail). Las dos formas de un provider (simple y con modelo inyectable), el cliente compartido de scraping y las decisiones de cada integración.
- [`context/frontend.md`](./context/frontend.md) — Stack, estructura de carpetas y convenciones de la app Angular: vistas dueñas y qué reutilizan, temas y tokens, componentes compartidos, patrones de composición e interacción (mobile primero, 44px táctiles) y cómo verificar un cambio visual.
- [`context/landing.md`](./context/landing.md) — Stack, changelog público, variables de build y CSP de la landing Astro.

### Otros recursos del repo

- [`api/`](./api/) — Colección Bruno v3.1 con todos los endpoints documentados (request, response, auth, rate limit).
- [`changelogs/`](./changelogs/) — Un archivo por feature entregada, con contexto y commits. Un solo changelog para todas las apps.

## Dónde va cada dato

Cada dato tiene un solo dueño. Si ya existe en otro archivo, se enlaza, no se copia; y si se lee en el código, no se escribe en ningún lado.

| Si vas a documentar…                                                                                                                      | Va en                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Un estándar de organización o escritura de código del backend (capas, nombres, comentarios)                                               | `architecture.md`                                                                               |
| La anatomía de un módulo, el sistema de errores o un provider                                                                             | `context/modules.md`, `context/errors.md`, `context/providers.md`                               |
| Un estándar del frontend o de la landing                                                                                                  | `context/frontend.md`, `context/landing.md`                                                     |
| Ramas, commits, tests o qué hacer después de editar                                                                                       | `context/conventions.md`                                                                        |
| Algo propio del proyecto que no se lee en el código (una regla y su porqué, infraestructura, una integración, un componente del catálogo) | `rules.md`, con su razón. Revísalo antes de crear un endpoint, una tabla, un job o una pantalla |
| Un endpoint: request, response, auth y errores                                                                                            | `api/`                                                                                          |
| Lo que se entregó y por qué                                                                                                               | `changelogs/`                                                                                   |
| Una decisión de producto (límites de un plan, qué significa un estado, roadmap, feedback, deuda técnica pendiente)                        | No va en el repo: es planificación de producto                                                  |
| Un enum, una columna, un rango de validación, un status o el valor de un límite                                                           | En ningún documento: la fuente es el código                                                     |

Lo que ya hacen cumplir ESLint, Prettier o el typecheck tampoco se documenta.
