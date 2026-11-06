# Estándares portables y documento del proyecto

**Released:** 2026-11-06

## Summary

`architecture.md` y los archivos de `context/` pasan a ser estándares portables: describen cómo se organiza y se escribe el código para este stack (Express + Sequelize, Angular, Astro) sin depender de las features de Completr, así que sirven tal cual en otro proyecto con el mismo stack. Todo lo propio del proyecto que no se lee en el código (reglas con su razón, infraestructura, integraciones, mecanismos compartidos y el catálogo de la interfaz) se concentra en `rules.md`. De paso se quitan las secciones que repetían el `package.json` y se deja cada regla en una sola sección de su archivo.

## Highlights

- `architecture.md` y `context/` no nombran módulos, features, integraciones ni infraestructura de Completr; los ejemplos usan `<recurso>`, `<modulo>` y un provider ficticio (`acme`).
- `rules.md` es el documento del proyecto: suma módulos pivote, mecanismos compartidos del backend, infraestructura y despliegue, integraciones externas, y las secciones de frontend (infraestructura de la web, colores de producto, búsqueda contextual, ubicación de controles, vista dueña y catálogo de componentes) y de landing.
- Cada regla vive en una sola sección de su archivo.

## Changed

- `docs/architecture.md`: estructura del repo con `apps/<app>` y carpetas `<modulo>/` y `<proveedor>/`; logs descritos como patrón; sin la sección `Stack` (está en el `package.json`), sin el Rewind ni la lista de mecanismos compartidos, que pasan a `rules.md`. Del párrafo de la raíz queda solo por qué el contexto de build de Docker es la raíz del repo.
- `docs/context/modules.md` y `docs/context/errors.md`: ejemplos genéricos. La lista de módulos pivote pasa a `rules.md`. En `errors.md`, las tablas de códigos `COMMON_*` se reducen a una sección de errores que no pasan por ningún módulo, y la tabla de las tres clases deja de repetir quién lanza cada una (eso está en las reglas duras).
- `docs/context/providers.md`: los apartados de HLTB, Metacritic, IGDB, Wikidata y DeepSeek se reemplazan por estándares genéricos de scraping y de IA; la clase del provider y su variante deshabilitada quedan en un solo ejemplo, con un solo constructor de error, y el checklist de un provider nuevo remite a cada sección.
- `docs/context/frontend.md` y `docs/context/landing.md`: reglas del stack escritas en genérico, sin la sección `Stack`. "Zoneless" pasa a las convenciones de Angular y las fuentes autoalojadas a su propia sección en la landing.
- `docs/context/conventions.md`: la configuración de tests de la API no nombra puertos, credenciales ni catálogos concretos, y se quita la anécdota de la post-edición.
- `docs/README.md`: describe `architecture.md` y `context/` como estándares portables y `rules.md` como documento del proyecto; la guía de uso se funde en la tabla "Dónde va cada dato" y se corrige que el changelog cubre todas las apps.
- `CLAUDE.md`: la tabla de `docs/` y la frontera con la planificación de producto reflejan la división entre estándares y proyecto.

## Files of interest

- `docs/rules.md`
- `docs/architecture.md`
- `docs/context/providers.md`
- `docs/README.md`

## Commits

- `82ae001c` — docs(api): make architecture a portable standard without project specifics
- `b8e5733d` — docs(repo): generalize conventions test setup for portability
- `9c2a6b12` — docs(api): use generic examples in module anatomy
- `1543bf91` — docs(api): use generic examples in error system
- `d28c9a73` — docs(api): replace project integrations with generic provider standards
- `579179dc` — docs(web): make frontend conventions a portable standard
- `fc42d295` — docs(landing): make landing conventions a portable standard
- `ae4c5107` — docs(repo): gather project specifics, integrations and ui catalog in rules
- `30fcd18a` — docs(repo): describe portable standards and project rules in docs index
- `c0a624aa` — docs(claude): describe portable standards and project rules boundary
- `384ed2c4` — docs(repo): fold docs index usage guide into the data ownership table
- `b50baf9c` — docs(repo): drop project anecdote from post-edit steps
- `8d18b931` — docs(api): keep each error system rule in a single section
- `a33184cb` — docs(api): merge provider class examples and keep each rule in one section
