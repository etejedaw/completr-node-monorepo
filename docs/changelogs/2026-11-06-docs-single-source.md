# Documentación con una sola fuente por dato

**Released:** 2026-11-06

## Summary

La documentación técnica repetía el mismo dato en varios archivos y mezclaba propósitos: `conventions.md` tenía reglas de código y flujo de trabajo, `architecture.md` tenía comportamiento del Rewind e `invariants.md` acumulaba ~600 líneas de mecanismo (enums, rangos, status por endpoint) que ya se leen en el código y en `docs/api/`. Ahora cada archivo tiene un propósito y cada dato un solo dueño; los demás enlazan. `invariants.md` pasa a llamarse `rules.md` y guarda solo las reglas que el código hace cumplir y cuyo porqué no se ve leyéndolo, cada una con su razón.

## Highlights

- `docs/rules.md` reemplaza a `docs/invariants.md`: de 609 a ~110 líneas, organizado en reglas generales, privacidad, concurrencia, datos externos, Rewind, export y borrado de cuenta.
- `docs/README.md` tiene una tabla "Dónde va cada dato" para decidir en qué archivo documentar algo, o si no se documenta porque está en el código.
- `architecture.md` concentra las reglas de escritura de código; `conventions.md` queda solo con el flujo de trabajo.

## Changed

- `docs/rules.md` (antes `invariants.md`): se quitó todo lo que se lee en el código (enums, columnas, rangos de schemas, status, fórmulas, umbrales, tablas de errores de providers) y se conservaron las reglas transversales con su razón. Suma reglas que antes no estaban escritas, como sumar una tabla nueva con datos de usuario a la comprobación `GAME_IN_USE` del borrado físico de juegos.
- `docs/architecture.md`: absorbe nombres, comentarios, alcance de cada cambio y los mecanismos compartidos que no se reimplementan (búsqueda de texto, `rethrowSequelizeError`, acciones masivas, exportaciones, acceso premium). Pierde el detalle del Rewind, el patrón de provider con modelo inyectable y las reglas que ya hacen cumplir ESLint y Prettier. Documenta por qué las columnas FK declaran `DataTypes.UUID` en el modelo.
- `docs/context/conventions.md`: solo ramas, commits, tests, post-edición y cuándo preguntar. Suma la regla de preferir scripts del `package.json` y CLIs antes que editar a mano, y quita la lista de comandos y los pasos de lint, formato y typecheck que corre el hook.
- `docs/context/modules.md`: única fuente de los nombres de archivo, la política de DTOs y la regla de `attributes` en los `include`.
- `docs/context/providers.md`: recibe el patrón de provider con modelo inyectable; quita las tablas de errores que repetían los mappers y el detalle que se lee en el código.
- `docs/context/errors.md`: los ejemplos de código se reemplazan por una tabla de quién lanza cada clase y un puntero a `apps/api/src/games/errors/`.
- `docs/context/frontend.md`: el catálogo de componentes queda en una línea por componente con su regla de uso; se recortan Shell, búsqueda contextual, fechas y patrones de interacción a reglas.
- `docs/context/landing.md`: sin lista de comandos.
- `CLAUDE.md`: la tabla de `docs/` y la frontera con la planificación de producto reflejan el nuevo alcance de `rules.md`.

## Migration

- Los enlaces a `invariants.md` pasan a `rules.md`; los anclajes (`#borrado-de-cuenta`, `#rate-limiting`, `#datos-externos`) se conservan.
- Un enum, una validación o un status ya no se documentan: la fuente es el código y, para el contrato HTTP, `docs/api/`. El paso de post-edición que actualizaba `invariants.md` ahora pide actualizar `rules.md` solo con reglas cuyo porqué no se ve en el código.

## Files of interest

- `docs/README.md`
- `docs/rules.md`
- `docs/architecture.md`
- `docs/context/conventions.md`

## Commits

- `723270df` — docs(api): keep in invariants only the rules whose reason the code does not show
- `6848c3c1` — docs(api): move code writing rules into architecture and drop duplicates
- `fd04e35f` — docs(repo): narrow conventions to workflow and prefer existing scripts and clis
- `34ad2779` — docs(api): own file naming and include attributes rule in module anatomy
- `fbedabc3` — docs(api): move injected model pattern into providers and trim code details
- `c61f735e` — docs(api): replace error system examples with a pointer to a real module
- `d8c7a750` — docs(web): reduce shared component catalog to purpose and usage rules
- `d7223ca6` — docs(landing): drop command list and point to architecture for code rules
- `b5f55638` — docs(repo): add data ownership table to docs index
- `480ce06c` — docs(claude): align docs table and boundary with the new invariants scope
- `15bdd7f3` — docs(api): document why foreign key columns declare their uuid type in models
- `0663e5be` — docs(repo): rename invariants to rules and update references
- `1b0f6005` — docs(claude): point docs table to rules.md
