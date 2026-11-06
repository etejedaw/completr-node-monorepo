# Documentación

Punto de entrada para entender cómo está organizado el código de Completr: backend en `apps/api`, frontend en `apps/web` y landing en `apps/landing`. Cada archivo cubre un tema concreto — si tienes una duda, este índice te dice a dónde ir.

## Índice

### Arquitectura general

- [`architecture.md`](./architecture.md) — Cómo está organizado el código y cómo se escribe: estructura del monorepo, stack del backend, capas, flujo de un request, reglas de código y decisiones de diseño. **Empieza aquí si nunca has visto el proyecto.**

### Reglas

- [`rules.md`](./rules.md) — Reglas que el sistema hace cumplir y cuyo porqué no se ve leyendo el código (privacidad, concurrencia, servicios externos, borrado de cuenta), cada una con su razón. Lo que se lee en el código (enums, validaciones, status) no se duplica ahí.

### Contexto detallado (`context/`)

- [`context/conventions.md`](./context/conventions.md) — Flujo de trabajo: ramas, commits, tests, qué hacer después de editar y cuándo preguntar.
- [`context/modules.md`](./context/modules.md) — Anatomía de un módulo de negocio. Qué archivos lleva y cómo se nombran, cuándo se crean carpetas, cómo se conectan los módulos entre sí y por qué nunca se importa el `Model` de otro módulo directamente.
- [`context/errors.md`](./context/errors.md) — Sistema de errores en 3 capas (`ServiceError` → `DomainError` → `HttpError`), quién lanza qué, los mappers y normalizers globales, y cómo agregar un error nuevo.
- [`context/providers.md`](./context/providers.md) — Adapters para integraciones externas (HTTP APIs, scrapers, IA, mail). Las dos formas de un provider (simple y con modelo inyectable), el cliente compartido de scraping y las decisiones de cada integración.
- [`context/frontend.md`](./context/frontend.md) — Stack, estructura de carpetas y convenciones de la app Angular: vistas dueñas y qué reutilizan, temas y tokens, componentes compartidos, patrones de composición e interacción (mobile primero, 44px táctiles) y cómo verificar un cambio visual.
- [`context/landing.md`](./context/landing.md) — Stack, changelog público, variables de build y CSP de la landing Astro.

### Otros recursos del repo

- [`api/`](./api/) — Colección Bruno v3.1 con todos los endpoints documentados (request, response, auth, rate limit).
- [`changelogs/`](./changelogs/) — Un archivo por feature entregada, con contexto y commits. Un solo changelog para las dos apps.

Esta carpeta describe **cómo funciona el código hoy**. La planificación de producto —roadmap, feedback de usuarios, deuda técnica pendiente— se lleva fuera del repo y no se documenta acá.

## Dónde va cada dato

Cada dato tiene un solo dueño. Si ya existe en otro archivo, se enlaza, no se copia; y si se lee en el código, no se escribe en ningún lado.

| Si vas a documentar…                                                              | Va en                                                             |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Cómo se organiza o se escribe el código del backend (capas, nombres, comentarios) | `architecture.md`                                                 |
| La anatomía de un módulo, el sistema de errores o un provider                     | `context/modules.md`, `context/errors.md`, `context/providers.md` |
| Una convención del frontend o de la landing                                       | `context/frontend.md`, `context/landing.md`                       |
| Ramas, commits, tests o qué hacer después de editar                               | `context/conventions.md`                                          |
| Una regla que el código hace cumplir y cuyo porqué no se ve leyéndolo             | `rules.md`, con su razón                                          |
| Un endpoint: request, response, auth y errores                                    | `api/`                                                            |
| Lo que se entregó y por qué                                                       | `changelogs/`                                                     |
| Una decisión de producto (límites de un plan, qué significa un estado, roadmap)   | No va en el repo: es planificación de producto                    |
| Un enum, una columna, un rango de validación, un status o el valor de un límite   | En ningún documento: la fuente es el código                       |

Lo que ya hacen cumplir ESLint, Prettier o el typecheck tampoco se documenta.

## Cómo usar esta carpeta

- ¿Vas a tocar un módulo existente? Lee `architecture.md` + `context/modules.md`.
- ¿Vas a crear un módulo nuevo? Lee `context/modules.md` y `context/errors.md`.
- ¿Vas a integrar un servicio externo? Lee `context/providers.md`.
- ¿Vas a tocar el frontend? Lee `context/frontend.md`.
- ¿Vas a tocar la landing? Lee `context/landing.md`.
- ¿Vas a crear un endpoint, una tabla o un job? Revisa `rules.md`: lista las reglas que tienes que respetar aunque no las veas en el código que tocas.
- ¿Necesitas una validación, un constraint o un código de error? Están en el código (schemas Zod, migraciones, `*.domain-to-http.mapper.ts`) y el contrato HTTP en `api/`.
- ¿Necesitas el valor exacto de un límite o los permisos de un rol? Están en el código: las constantes `FREE_*_LIMIT` de cada service y el `authMiddleware(...)` de cada `*.routes.ts`.
- ¿Vas a commitear o abrir un PR? Revisa `context/conventions.md`.
