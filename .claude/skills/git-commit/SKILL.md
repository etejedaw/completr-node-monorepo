---
name: git-commit
description: Create granular git commits following Conventional Commits with single-line messages in English and no AI signature, grouping changes by file. Use when the user asks to commit, "haz commit", "commitea" or runs /git-commit.
license: Apache-2.0. Complete terms in LICENSE
---

# Git Commit

## Configuración del proyecto

Las reglas de abajo son los valores por defecto. Si el `CLAUDE.md` del proyecto define otra cosa (scopes, idioma), manda lo del proyecto.

## Reglas

1. **Conventional Commits**: formato `<type>(<scope>): <subject>`. Tipos válidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`.
2. **Una sola línea**: el commit es solo el subject. Sin body, sin footer, sin trailers (ni `-m "..." -m "..."` ni HEREDOCs con body).
3. **Granular pero pragmático**: cada commit cubre un único cambio lógico. Si el working tree mezcla cambios no relacionados, se dividen en commits separados, **agrupando por archivo**, no por hunk. Si un archivo mezcla 2-3 intenciones cercanas, va en un solo commit con un subject que abarque la intención dominante. Nada de commits "misc fixes" o "various updates".
4. **Sin firma**: nunca agregar `Co-Authored-By: Claude...` ni ningún tipo de atribución de IA.
5. **En inglés**.

## Flujo

1. `git status` y `git diff` para ver el estado.
2. Si hay cambios no relacionados, agruparlos mentalmente por intención.
3. Por cada grupo:
    - Stagear solo los archivos del grupo con `git add <files>`.
    - Elegir `type` y `scope` apropiados al cambio.
    - Subject en imperativo, en minúsculas, sin punto final.
    - `git commit -m "<type>(<scope>): <subject>"`.
    - Si el commit falla por un hook, detenerse y mostrarle el error al usuario. No corregir ni reintentar.
4. Verificar con `git log --oneline -n <N>`.

## Scope

El módulo o la feature que toca el cambio (`auth`, `users`, `invoices`). En un monorepo, si no hay un módulo claro, el nombre de la app (`api`, `web`, `landing`) o `repo` para cambios transversales (workspaces, tooling, Docker). Antes de inventar un scope, revisa `git log --oneline -n 30` y reutiliza los que ya existen.

## Ejemplos

- `feat(auth): add register endpoint`
- `fix(users): correct slug generation with accented names`
- `refactor(events): extract date validation helper`
- `docs(readme): document migration workflow`
- `chore(deps): bump zod to 4.4.0`

## Prohibido

- `git add .` o `git add -A` cuando hay múltiples grupos de cambios.
- `git add -p` ni cirugía de hunks: el costo en tokens y complejidad supera el beneficio de granularidad fina. La unidad mínima de commit es el archivo.
- `--no-verify` o cualquier otra forma de saltarse los hooks.
