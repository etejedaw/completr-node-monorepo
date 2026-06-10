# Documentación

Punto de entrada para entender cómo está organizado este backend. Cada archivo cubre un tema concreto — si tienes una duda, este índice te dice a dónde ir.

## Índice

### Arquitectura general

- [`architecture.md`](./architecture.md) — Vista panorámica: stack, capas, cómo fluye un request, decisiones de diseño y dónde vive cada cosa. **Empieza aquí si nunca has visto el proyecto.**

### Contexto detallado (`context/`)

- [`context/conventions.md`](./context/conventions.md) — Reglas de código y trabajo. Estilo, nombres, commits, qué hacer después de editar, cuándo comentar (casi nunca), Clean Code aplicado a este repo.
- [`context/modules.md`](./context/modules.md) — Anatomía de un módulo de negocio. Qué archivos lleva, cuándo se crean carpetas, cómo se conectan los módulos entre sí y por qué nunca se importa el `Model` de otro módulo directamente.
- [`context/errors.md`](./context/errors.md) — Sistema de errores en 3 capas (`ServiceError` → `DomainError` → `HttpError`), quién lanza qué, los mappers y normalizers globales, y cómo agregar un error nuevo.
- [`context/providers.md`](./context/providers.md) — Adapters para integraciones externas (HTTP APIs, scrapers, librerías). Cómo se estructuran, qué responsabilidades tienen y cómo se diferencian de los servicios.

### Otros recursos del repo

- [`api/`](./api/) — Colección Bruno v3.1 con todos los endpoints documentados (request, response, auth, rate limit).
- [`feedback/`](./feedback/) — Feedback de beta testers agrupado por fase (`fase-X.md` con entradas `FB-NNN`).

## Cómo usar esta carpeta

- ¿Vas a tocar un módulo existente? Lee `architecture.md` + `context/modules.md`.
- ¿Vas a crear un módulo nuevo? Lee `context/modules.md` y `context/errors.md`.
- ¿Vas a integrar un servicio externo? Lee `context/providers.md`.
- ¿Vas a abrir un PR? Revisa `context/conventions.md` antes de commitear.
