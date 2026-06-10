# Reestructura de documentación técnica

**Released:** 2026-06-10

## Summary

Antes de Fase 3 entrar en beta cerrada, separa el "qué del producto" del "cómo del código". `README.md` se convierte en setup local + descripción para humanos. Se crea `docs/architecture.md` con la vista panorámica del backend (capas, flujo de request, decisiones) y `docs/context/` con las guías detalladas: convenciones de código, anatomía de un módulo, sistema de errores y providers. `CONTEXT.md` queda enfocado solo en dominio y producto (visión, ratio, vistas vs listas, monetización, roles, roadmap) — todo lo técnico migrado a `docs/`. Sin solapamiento entre los dos.

## Highlights

- `README.md` con descripción del producto, link al frontend, setup local con Docker Compose.
- `docs/README.md` como índice de la documentación técnica.
- `docs/architecture.md` con stack, estructura de carpetas, capas, flujo de request y decisiones clave.
- `docs/context/conventions.md` — estilo, naming, commits, política de comentarios (casi nunca), Clean Code aplicado.
- `docs/context/modules.md` — anatomía de un módulo, regla `1 → raíz, 2+ → subcarpeta`, regla "service entre módulos, nunca model".
- `docs/context/errors.md` — sistema de errores en 3 capas con ejemplos reales de `games/`.
- `docs/context/providers.md` — adapters para integraciones externas (RAWG implementado, HLTB/Metacritic/Steam pendientes).
- `CONTEXT.md` slim: solo producto y dominio.

## Added

- **`README.md`** completo: descripción tipo Trakt-para-videojuegos, link al frontend (`completr-node-frontend`) y a `web.completr.app`, stack, requisitos, `docker compose up -d` con DBs + pgAdmin, migraciones, scripts útiles, estructura de módulos, link a Bruno.
- **`docs/README.md`** índice: cuándo ir a cada archivo según la duda.
- **`docs/architecture.md`** panorámica técnica.
- **`docs/context/conventions.md`** reglas de código y trabajo.
- **`docs/context/modules.md`** anatomía de módulos.
- **`docs/context/errors.md`** sistema de errores documentado a detalle.
- **`docs/context/providers.md`** adapters para integraciones.

## Changed

- **`CONTEXT.md` reducido** de ~450 a ~210 líneas. Removidas: stack técnico, estructura de carpetas, arquitectura, branching, commits, post-edición, patrones de capas, patrón de errores, providers. Conservadas: visión, conceptos de dominio (scores en 3 niveles, ratio, vistas vs listas, wishlist/favorites, estados, backlogs, semestres), roles, roadmap por fase, público objetivo, monetización, integraciones.

## Files of interest

- `README.md`.
- `docs/README.md`, `docs/architecture.md`.
- `docs/context/conventions.md`, `docs/context/modules.md`, `docs/context/errors.md`, `docs/context/providers.md`.
- `CONTEXT.md` (slim).

## Commits

- `dbb03de` — docs(readme): add project overview and local setup instructions
- `5638f39` — docs(architecture): add architecture and context guides under docs/
- `8316958` — docs(context): focus CONTEXT.md on product and domain, drop technical sections moved to docs/
