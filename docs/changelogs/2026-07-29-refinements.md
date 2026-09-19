# Refinements de junio y julio

**Released:** 2026-07-29

## Summary

Ajustes chicos e independientes de las dos apps entre el 2026-06-10 y el 2026-07-29 que no forman parte de ninguna feature documentada: fixes puntuales, performance de navegación, tooling de desarrollo, dependencias y documentación.

## Added

- Docker de desarrollo: pgAdmin arranca con los servidores de Postgres local y de test ya configurados (`.docker/pgadmin/`).
- Skill `changelog` con su plantilla en `.claude/skills/changelog/`.
- `docs/business-rules.md` como referencia atómica de reglas de negocio (luego sale del repo, ver `2026-09-08-docs-ownership-split.md`).
- Bruno: entradas de `reviews` y de los jobs de admin.
- `docs/context/conventions.md`: patrón de whitelist de `attributes` en los includes de Sequelize.
- Frontend: toast con deshacer al borrar una actividad del feed.
- Frontend: estado vacío en los highlights del mes.
- Frontend: entrada de What's New para quick actions y drag-to-reorder.
- Frontend: hook de pre-commit con lint-staged (hoy unificado en la raíz).

## Changed

- Frontend: el router precarga los chunks lazy y el sidebar marca la ruta activa de forma optimista.
- `activity` y `coop-runs`: bloques aplanados con guard clauses.
- Comentarios explicativos eliminados en el backend, salvo las notas sobre el orden de regex.
- Se elimina la migración ya aplicada del backfill de entidades HTML.
- Skill `endpoint-doc` referencia el formato de Bruno v4.0+.
- Email y URL del autor en `package.json`.
- `.gitignore` suma el directorio `tmp/` en las dos apps.
- Dependencias: fixes de `npm audit` en `js-cookie`, `qs` y `uuid`; `js-yaml` 4.3.0.

## Fixed

- `auth` valida el formato del username en el registro.
- Frontend: el access token vencido se refresca al arrancar, lo que evita los 401 iniciales.
- Frontend: `backlog-modal` muestra la validación cuando un campo requerido oculto bloquea el alta, en lugar de no hacer nada.
- Frontend: los datos lazy de los tabs del perfil se reinician al cambiar de perfil.
- Frontend: el toggle de favorito respeta el límite de 100 y quita solo el favorito afectado.
- Frontend: las cards de favoritos no muestran el toggle de wishlist.
- Frontend: la barra de búsqueda no muestra el botón nativo de limpiar.
- Frontend: About indica Angular 22 en el stack.

## Commits

### Backend

- `e73042bb` — chore(skills): add changelog skill with separate template.md
- `6918fcc2` — chore(gitignore): ignore tmp directory
- `c18f4313` — docs(business-rules): add atomic business rules reference
- `12572782` — chore(deps): fix npm audit vulnerabilities in js-cookie, qs and uuid
- `ee9192d3` — feat(docker): preload pgadmin with local/test postgres servers
- `6d4504b6` — refactor: drop explanatory comments, keep only regex-ordering notes
- `b26c4075` — chore(migrations): drop completed html entities backfill
- `f69c2f66` — docs(api): add Bruno entries for reviews and admin jobs endpoints
- `21acc1a9` — docs(conventions): document attributes whitelist pattern for Sequelize includes
- `ad052eca` — fix(auth): validate username format on register
- `39951ebf` — refactor(activity): flatten persist target block with guard clause
- `cb9e0ae0` — refactor(coop-runs): flatten removeMember cleanup with guard clause
- `f217fafc` — chore(deps): bump js-yaml to 4.3.0
- `1ca8ce5e` — docs(endpoint-doc): bump referenced bruno format to v4.0+
- `9a8a3dc3` — chore(pkg): update author email and url

### Frontend

- `2e975e82` — feat(feed): add undo toast when deleting an activity
- `1e4e5e8d` — fix(profile): reset lazy tab data when switching to another profile
- `ca0f9130` — chore: ignore tmp/ scratch directory
- `ea74acf9` — fix(favorites): enforce 100 cap on toggle and remove only the targeted favorite
- `46886e1c` — docs(whats-new): announce quick actions and drag-to-reorder
- `b8e2b4be` — perf(navigation): preload lazy chunks and show optimistic active state in sidebar
- `849151d0` — feat(profile): add empty state for month highlights
- `e5f87940` — fix(ui): remove native clear button from search bar
- `a16cdbcf` — fix(favorites): remove wishlist toggle from favorites cards
- `ba3f8659` — chore(husky): add pre-commit hook running lint-staged
- `96955180` — fix(auth): proactively refresh expired access token on startup to avoid initial 401s
- `59d6cdcc` — fix(backlog-modal): surface validation instead of silently blocking add on hidden required fields
- `90de34f5` — fix(about): correct stack version to angular 22
