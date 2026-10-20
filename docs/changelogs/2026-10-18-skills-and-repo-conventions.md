# Skills, convenciones del repo y entorno local

**Released:** 2026-10-18

## Summary

Tanda de mantenimiento del repo, sin cambios funcionales. Las skills locales del agente se reemplazan por las de un paquete compartido, y se suma una skill propia para el changelog público. `docs/` documenta convenciones que hasta ahora eran implícitas: historial lineal, worktrees, cuándo escribir el changelog, el proceso del rediseño en web y los rate limits de auth. El Postgres de desarrollo y el de pruebas guardan sus datos en carpetas locales del repo.

## Highlights

- Skills `git-commit`, `release-changelog`, `sequelize-migration` y `bruno-endpoints` instaladas desde un paquete externo y fijadas en `skills-lock.json`.
- Skill nueva `release-changelog-public` para las entradas de la landing y de "What's new".
- `conventions.md`: historial lineal en `develop`, worktrees y changelog al cierre de la tanda.
- Datos de Postgres persistidos en `apps/api/.docker/`.

## Added

- `.claude/skills/release-changelog-public/`: escribe las entradas públicas a partir de los changelogs técnicos, con su plantilla.
- `skills-lock.json` con las versiones de las skills instaladas.
- `docs/context/frontend.md`: secciones sobre la vista dueña y las vistas que la reutilizan, patrones de composición y el proceso de diseño y verificación del rediseño.
- `docs/invariants.md`: valores de `authLimiter` (5 por minuto, bloqueo de 15 minutos) y `registerLimiter` (3 por minuto), con referencia a `rate-limiter.config.ts`.
- `apps/api/.env.example`: `PG_TEST_PORT` y `PGADMIN_PORT`.

## Changed

- `.claude/skills/`: `commit`, `changelog`, `db-migration` y `endpoint-doc` se reemplazan por `git-commit`, `release-changelog`, `sequelize-migration` y `bruno-endpoints`. La configuración propia del repo (carpetas, idioma, estilo de migraciones) pasa a las instrucciones del agente en `CLAUDE.md`.
- `docs/context/conventions.md`: integración por rebase y `--ff-only` en `develop`, worktrees en `.worktree/<bloque>`, ninguna firma de IA en commits, merges, migraciones o PRs, el changelog una vez al cierre de la tanda, pedir confirmación antes de migrar o tocar datos, y rutas a las skills nuevas.
- `apps/api/docker-compose.yml`: `postgres` y `postgres-test` montan `./.docker/postgres` y `./.docker/postgres-test` como datos.
- `.gitignore` ignora esas carpetas de datos. `.prettierignore` también, junto con toda `.claude/skills`.

## Removed

- Tabla de skills en `CLAUDE.md`, que repetía las descripciones de cada skill.

## Commits

- `d89f575f` — docs(auth): document auth and register rate limits
- `124cd44c` — docs(repo): add linear history, worktree and changelog conventions
- `699fcbf6` — docs(web): document redesign conventions, shared components and patterns
- `160dbbe3` — chore(api): add the test postgres and pgadmin ports to the env example
- `a841cd64` — feat(skills): add release-changelog-public skill
- `bae7e6b5` — chore(skills): replace local skills with workflow-skills
- `8d997ad0` — docs(claude): document skills, changelog and migration settings
- `ad074713` — docs(repo): point conventions to the new skill paths
- `15f0d2c2` — chore(prettier): ignore installed skills
- `bf84f3bf` — docs(claude): drop the skills table that repeats the skill descriptions
- `093cd1dd` — chore(repo): ignore local postgres data folders
- `f7c524ff` — chore(api): persist postgres data in local bind mounts
