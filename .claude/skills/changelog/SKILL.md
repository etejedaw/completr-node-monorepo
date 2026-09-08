---
name: changelog
description: Generate per-feature changelog documents in docs/changelogs/ summarizing commits since the last documented release. Trigger when the user asks to "registrar cambios", "actualizar el changelog", "preparar release", "documentar lo que se ha hecho" o antes de un paso a productivo. Format and process live in this skill; never rewrites historical entries.
---

# Changelog

Genera documentos changelog por feature (Keep a Changelog adaptado) en `docs/changelogs/`. Un archivo por feature. La skill define el **proceso** (qué commits agrupar, qué descartar, cómo nombrar); el **formato del archivo** vive en [`template.md`](./template.md) — léelo antes de generar.

`Released`, `Summary` y `Commits` son obligatorias en cada archivo; el resto solo si aplica.

## Contexto del proyecto

- **Repo:** backend de Completr (Node.js + Express + Sequelize). El producto y sus reglas de negocio se documentan fuera del repo (ver `CLAUDE.md`). Lo técnico vive en `docs/architecture.md`, `docs/invariants.md` y `docs/context/`.
- **Los changelogs son públicos** (repo AGPLv3): no mencionan herramientas ni documentos internos de planificación, solo lo que cambió en el código y en `docs/`.
- **Idioma:** español, sin emojis, frases cortas. Mismo tono que el resto de `docs/`.

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

- **Módulo de negocio nuevo o tocado** (`auth`, `games`, `backlog`, `lists`, `wishlist`, `favorites`, `game-shelf`, etc.).
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

**Esperar confirmación.** Si el usuario reagrupa, ajustar y volver a mostrar.

### 6. Generar archivos

Por cada grupo confirmado, crear `docs/changelogs/YYYY-MM-DD-<feature>.md` siguiendo la plantilla en [`template.md`](./template.md). Secciones obligatorias: `Released`, `Summary`, `Commits`. Las secciones `Added / Changed / Removed / Fixed / Migration` solo si aplican.

**Estilo:**

- Español, tono profesional, sin emojis.
- Bullets concretos, frases cortas — mismo registro que `docs/feedback/fase-N.md` y `docs/context/`.
- Hashes con backticks: `` `c892226` `` — subject del commit.
- Referenciar módulos por su nombre real en `src/` (`backlog`, `game-shelf`, `list-items`).
- En la sección `Commits`, listar **todos** los commits del grupo (incluso style/refactor accesorios) — ese es el ledger.
- En `Released`: fecha `YYYY-MM-DD` del último commit del grupo (formato declarado en `docs/changelogs/README.md`).

### 7. Verificar

- `git log <base>..HEAD --oneline | wc -l` matchea con (commits documentados + commits descartados).
- Ningún changelog viejo fue tocado.

**No hace commit automáticamente.** Deja los archivos en el working tree para que el usuario revise y use `/commit`.

## Decisiones que toma esta skill (sin preguntar)

- Excluir TODO bookkeeping, feedback bookkeeping y style-only commits standalone.
- Fecha del archivo = fecha del último commit del grupo (formato `YYYY-MM-DD`).
- Nombre del archivo: kebab-case derivado del tema dominante del grupo.
- Estructura del template (sin inventar secciones nuevas).

## Decisiones que NUNCA toma esta skill (siempre pregunta)

- Si dos grupos parecen separables o consolidables.
- Si un commit puede ir en dos grupos (¿cuál es el principal?).
- Si un cambio pequeño merece su propio archivo o entra en un refinements doc.
- Si descartar un commit que parece bookkeeping pero podría no serlo.

## Reglas

- **Nunca tocar changelogs ya creados.** Si una convención cambia (ej: regla de imports, formato de errores), crear un **nuevo** changelog. Los viejos son historia y deben quedar fieles a la fecha que llevan.
- **El changelog se commitea con el feature, no después.** Idealmente: feature commits + changelog + commit `docs(changelogs): add <feature> entry`. La skill genera los archivos; el usuario los commitea.
- **Hashes deben matchear commits reales.** Si un commit cambia de hash (rebase, amend), actualizar el changelog antes de mergear.

## Anti-patterns

- Un changelog por commit (ruido).
- Un changelog genérico "Misc updates" que mezcla features no relacionadas.
- Reescribir un changelog histórico para reflejar cambios posteriores.
- Incluir commits de TODO/feedback bookkeeping.
- Inventar fechas que no correspondan al último commit del grupo.
- Usar emojis en los archivos generados.

## Checklist final

- [ ] Cada commit no documentado entra en algún changelog o está explícitamente descartado.
- [ ] Hashes en cada doc matchean `git log --oneline`.
- [ ] No se modificó ningún changelog viejo.
- [ ] El usuario revisó los archivos antes de commitear.
