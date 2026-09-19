---
name: changelog
description: Generate per-feature changelog documents in docs/changelogs/ summarizing commits since the last documented release, plus a public release entry in apps/landing/src/content/releases/ when the changes are user-facing features. Trigger when the user asks to "registrar cambios", "actualizar el changelog", "preparar release", "documentar lo que se ha hecho" o antes de un paso a productivo. Format and process live in this skill; never rewrites historical entries.
---

# Changelog

Genera dos tipos de changelog:

- **Técnico**, en `docs/changelogs/`: un archivo por feature (Keep a Changelog adaptado), para quien lee el código. Formato en [`changelog-template.md`](./changelog-template.md).
- **Público**, en `apps/landing/src/content/releases/`: una entrada por release visible para los usuarios. Se muestra en `https://www.completr.app/changelog` y en la página "What's new" de la app. Formato en [`release-template.md`](./release-template.md).

La skill define el **proceso** (qué commits agrupar, qué descartar, cómo nombrar, cuándo hay entrada pública). Lee las dos plantillas antes de generar.

`Released`, `Summary` y `Commits` son obligatorias en cada archivo; el resto solo si aplica.

## Contexto del proyecto

- **Repo:** monorepo de Completr. Backend en `apps/api` (Node.js + Express + Sequelize), frontend en `apps/web` (Angular) y landing en `apps/landing` (Astro). El producto y sus reglas de negocio se documentan fuera del repo (ver `CLAUDE.md`). Lo técnico vive en `docs/architecture.md`, `docs/invariants.md` y `docs/context/`.
- **Un solo changelog para todas las apps.** Un grupo puede mezclar commits de distintas apps si cuentan la misma feature. Los commits del frontend y de la landing anteriores a su migración al monorepo no se documentan hacia atrás.
- **El changelog público es un subconjunto.** Todo grupo tiene su archivo técnico; solo los grupos con cambios que un usuario nota tienen además entrada pública (ver paso 7).
- **Los changelogs son públicos** (repo AGPLv3): no mencionan herramientas ni documentos internos de planificación, solo lo que cambió en el código y en `docs/`.
- **Idioma:** el changelog técnico va en español, sin emojis, frases cortas, con el mismo tono que el resto de `docs/`. El público tiene sus propias reglas de idioma (paso 7).

## Cuándo invocar

- **Antes de un paso a productivo**: documentar todo lo que entra al deploy.
- Tras completar una feature significativa: nuevo módulo, refactor mayor, cambio de convención, nueva integración con provider externo, cambio en el sistema de errores.
- Cuando el usuario lo pide explícitamente ( "actualiza el changelog", "documenta lo que se hizo").

## Información que necesitas antes de empezar

1. **Rama base** para comparar: por defecto `main`. Si la rama actual es `main`, preguntar referencia (último tag de fase, hash específico, último merge de release).
2. **Rama actual**: la que tiene los commits a documentar (típicamente `develop` o feature branch).

Si todos los commits desde la base ya están documentados en algún changelog, la skill avisa y termina sin generar nada.

## Flujo

### 1. Cargar contexto

- Lista los changelogs ya existentes en `docs/changelogs/` y extrae los hashes documentados con grep por la sección `## Commits`.

### 2. Listar commits no documentados

```bash
git log <base>..HEAD --pretty=format:"%h %ad %s" --date=short
```

Compara con los hashes ya documentados. Los que sobran son candidatos a entrar en algún changelog.

### 3. Filtrar ruido

**NUNCA** incluir:

- TODO bookkeeping (`docs(todo): mark Px as completed`, `docs: update TODO.md...`).
- Commits que solo añaden o quitan `TODO.md`, `CONTEXT.md` (cuando es solo restructure) o `MEMORY.md`.
- Style/format puro **standalone** (si acompañan a un feature, van con el feature).
- Merge commits.
- Commits de actualización de la propia carpeta `docs/changelogs/`.

Si un commit es ambiguo, preguntar al usuario antes de descartarlo.

### 4. Agrupar por feature

Analiza subject + archivos tocados de cada commit. Agrupa por:

- **Módulo de negocio nuevo o tocado** (`auth`, `games`, `backlog`, `lists`, `wishlist`, `favorites`, `game-shelf`, etc.), junto con la feature del frontend que lo consume.
- **Feature del frontend sin cambios en el backend** (`apps/web/src/app/features/<feature>`).
- **Provider nuevo o ajustado** (`rawg`, `hltb`, `metacritic`, `steam`).
- **Cambio transversal** (sistema de errores, convención de imports, middleware nuevo, refactor de `request.locals`).
- **Documentación arquitectónica** (cambios estructurales en `docs/` que valga la pena destacar).

**Granularidad:** una feature = algo que merece un doc autocontenido. Si varios commits cuentan una sola historia ("agregamos endpoint X, ajustamos el schema, documentamos en Bruno"), un solo changelog. Si son cambios pequeños independientes, agruparlos en un doc estilo `refinements`.

Casos típicos en este repo:

- 5 commits implementando el módulo `reviews` (model + service + controller + routes + Bruno) → 1 doc.
- 1 commit aislado renombrando un schema → probablemente parte de un refinements doc, no su propio archivo.
- 2 commits agregando un endpoint nuevo a `games` + su entrada Bruno → 1 doc.
- Cambio en convenciones (`docs/context/conventions.md`) + ajustes en 3 módulos para cumplirlas → 1 doc con sección `Migration` explicando el cambio.

### 5. Proponer y confirmar grupos

Mostrar al usuario:

- Cantidad de grupos identificados.
- Nombre tentativo de cada uno (`YYYY-MM-DD-<feature>.md`).
- Cuántos commits incluye cada uno y la fecha calculada.
- Commits descartados (con razón breve).
- Qué grupos llevan **entrada pública** y cuáles no, con la razón. Si varios grupos van a una sola entrada pública (por ejemplo, fixes sueltos en una entrada `Fixes`), dilo.

**Esperar confirmación.** Si el usuario reagrupa, ajustar y volver a mostrar.

### 6. Generar archivos

Por cada grupo confirmado, crear `docs/changelogs/YYYY-MM-DD-<feature>.md` siguiendo la plantilla en [`changelog-template.md`](./changelog-template.md). Secciones obligatorias: `Released`, `Summary`, `Commits`. Las secciones `Added / Changed / Removed / Fixed / Migration` solo si aplican.

**Estilo:**

- Español, tono profesional, sin emojis.
- Bullets concretos, frases cortas — mismo registro que `docs/feedback/fase-N.md` y `docs/context/`.
- Hashes con backticks: `` `c892226` `` — subject del commit.
- Referenciar módulos por su nombre real en `apps/api/src/` (`backlog`, `game-shelf`, `list-items`) y features por su carpeta en `apps/web/src/app/features/`.
- En la sección `Commits`, listar **todos** los commits del grupo (incluso style/refactor accesorios) — ese es el ledger.
- En `Released`: fecha `YYYY-MM-DD` del último commit del grupo (formato declarado en `docs/changelogs/README.md`).

### 7. Generar la entrada pública (solo si aplica)

**Cuándo lleva entrada pública:** cuando el usuario de la app nota el cambio. Por ejemplo, una feature nueva, un cambio de UX, una mejora visible de rendimiento o un bug que el usuario sufría.

**Cuándo no:** refactors, tooling, dependencias, CI, Docker, deploy, documentación, cambios internos de la API sin efecto visible y cambios de la propia landing. Ante la duda, pregunta en el paso 5.

**Agrupación:** normalmente un grupo técnico da una entrada pública. Varios grupos pequeños que el usuario percibe como "arreglos" van juntos en una entrada con `tag: Fixes`. Una versión grande (un tag `vX.Y.Z` que cierra una fase) puede tener además su propia entrada de resumen con `tag: Launch`.

**Archivo:** `apps/landing/src/content/releases/YYYY-MM-DD-NN-<slug>.md`, siguiendo [`release-template.md`](./release-template.md).

- `YYYY-MM-DD`: la misma fecha que el `Released` del changelog técnico.
- `NN`: correlativo del día, con dos dígitos. Si ya hay archivos con esa fecha, usa el siguiente número libre.
- `<slug>`: kebab-case en inglés, corto (`franchise-tracker`, `coop-runs`).
- El archivo solo tiene frontmatter, sin cuerpo.

**Campos** (el schema vive en `apps/landing/src/content.config.ts`, y el build falla si no se cumple):

| Campo              | Idioma  | Dónde se ve                                 | Regla                                                                                                                   |
| ------------------ | ------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `date`             | —       | Landing y app                               | `YYYY-MM-DD`                                                                                                            |
| `order`            | —       | —                                           | Desempata entradas del mismo día: **la más alta se muestra primero**. La entrada más importante del día lleva el mayor. |
| `tag`              | Inglés  | Landing y app                               | Una o dos palabras (`Sagas`, `Social`, `Fixes`, `Launch`). Reutiliza un tag existente si encaja.                        |
| `title`            | Inglés  | Landing y app                               | Una línea. Lo que gana el usuario, no el nombre técnico. Comillas si lleva `:` o `—`.                                   |
| `icon`             | —       | Landing y app                               | Nombre de [Material Icons](https://fonts.google.com/icons?icon.set=Material+Icons) en snake_case.                       |
| `tint`             | —       | Landing y app                               | `brand`, `purple`, `warning`, `success` o `danger`. `warning` para fixes, `brand` para features principales.            |
| `landing.pitch`    | Español | Landing (`/` y `/changelog`)                | Una o dos frases. Qué puede hacer ahora el usuario.                                                                     |
| `landing.featured` | —       | —                                           | `true` solo en releases grandes (versión nueva, feature principal). Si no, se omite.                                    |
| `highlights`       | Inglés  | App (página "What's new", vía `/changelog`) | De 2 a 6 ítems con `icon`, `tint` y `text`. Cada `text` es un cambio concreto contado desde el lado del usuario.        |

**Tono:** para usuarios, no para devs. Sin nombres de endpoints, módulos, tablas, commits ni librerías. En segunda persona o impersonal ("You can now…", "Ahora puedes…"). Usa los nombres de secciones que ve el usuario en la app (`My Games`, `Up Next`, `Want to Get`), no los internos (`backlog`, `queue`, `wishlist`).

Toma como referencia de estilo las entradas más recientes de `apps/landing/src/content/releases/`.

**Mostrar el texto al usuario antes de dejarlo listo.** El changelog público es copy de producto: `title`, `pitch` y `highlights` se revisan con el usuario igual que los grupos del paso 5.

### 8. Verificar

- `git log <base>..HEAD --oneline | wc -l` matchea con (commits documentados + commits descartados).
- Ningún changelog viejo fue tocado, ni técnico ni público.
- Si hubo entrada pública: `npm run build:landing` pasa. Valida el frontmatter contra el schema.

**No hace commit automáticamente.** Deja los archivos en el working tree para que el usuario revise y use `/commit`.

## Decisiones que toma esta skill (sin preguntar)

- Excluir TODO bookkeeping, feedback bookkeeping y style-only commits standalone.
- Fecha del archivo = fecha del último commit del grupo (formato `YYYY-MM-DD`).
- Nombre del archivo: kebab-case derivado del tema dominante del grupo.
- Estructura de `changelog-template.md` y `release-template.md` (sin inventar secciones ni campos nuevos).
- Que un grupo sin cambios visibles para el usuario no lleva entrada pública.
- Nombre del archivo público (`NN` = siguiente libre del día) y `order` (mayor = más importante).

## Decisiones que NUNCA toma esta skill (siempre pregunta)

- Si dos grupos parecen separables o consolidables.
- Si un commit puede ir en dos grupos (¿cuál es el principal?).
- Si un cambio pequeño merece su propio archivo o entra en un refinements doc.
- Si descartar un commit que parece bookkeeping pero podría no serlo.
- Si un cambio dudoso merece entrada pública, y si va sola o dentro de una entrada `Fixes`.
- El texto final de `title`, `pitch` y `highlights`.

## Reglas

- **Nunca tocar changelogs ya creados** (técnicos ni públicos). Si una convención cambia (ej: regla de imports, formato de errores), crear un **nuevo** changelog. Los viejos son historia y deben quedar fieles a la fecha que llevan.
- **El changelog se commitea con el feature, no después.** Idealmente: feature commits + changelog + commit `docs(changelogs): add <feature> entry`. La skill genera los archivos; el usuario los commitea.
- **Hashes deben matchear commits reales.** Si un commit cambia de hash (rebase, amend), actualizar el changelog antes de mergear.

## Anti-patterns

- Un changelog por commit (ruido).
- Un changelog genérico "Misc updates" que mezcla features no relacionadas.
- Reescribir un changelog histórico para reflejar cambios posteriores.
- Incluir commits de TODO/feedback bookkeeping.
- Inventar fechas que no correspondan al último commit del grupo.
- Usar emojis en los archivos generados.
- Entrada pública para cambios internos (refactor, tooling, deploy) o con jerga técnica.
- `pitch` en inglés o `title` / `highlights` en español.

## Checklist final

- [ ] Cada commit no documentado entra en algún changelog o está explícitamente descartado.
- [ ] Hashes en cada doc matchean `git log --oneline`.
- [ ] No se modificó ningún changelog viejo.
- [ ] Cada grupo con cambios visibles tiene su entrada pública, o el usuario decidió que no la lleve.
- [ ] `npm run build:landing` pasa si se agregó una entrada pública.
- [ ] El usuario revisó los archivos antes de commitear.
