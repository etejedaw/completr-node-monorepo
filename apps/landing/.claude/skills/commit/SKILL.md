---
name: commit
description: Create granular git commits following Conventional Commits with single-line messages and no AI signature. Use when the user asks to commit changes in this project.
---

# Commit

Reglas para crear commits en este proyecto.

## Reglas

1. **Conventional Commits**: formato `<type>(<scope>): <subject>`. Tipos válidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`.
2. **Una sola línea**: el commit es solo el subject. Sin body, sin footer, sin trailers.
3. **Granular pero pragmático**: cada commit cubre un único cambio lógico. Si el working tree mezcla cambios no relacionados, se dividen en commits separados — **agrupando por archivo**, no por hunk. Si un archivo mezcla 2-3 intenciones cercanas, va en un solo commit con un subject que abarque la intención dominante. La granularidad no justifica gastar tokens en cirugía de hunks.
4. **Sin firma**: nunca agregar `Co-Authored-By: Claude...` ni ningún tipo de atribución de IA.

## Flujo

1. `git status` y `git diff` para ver el estado.
2. Si hay cambios no relacionados, agruparlos mentalmente por intención.
3. Por cada grupo:
    - Stagear solo los archivos del grupo con `git add <files>`. **No usar `git add -p`** — el costo en tokens y complejidad supera el beneficio de granularidad fina.
    - Elegir `type` y `scope` apropiados al cambio.
    - Subject en imperativo, en minúsculas, sin punto final.
    - `git commit -m "<type>(<scope>): <subject>"`.
4. Verificar con `git log --oneline -n <N>`.

## Ejemplos

- `feat(auth): add register endpoint`
- `fix(stands): correct slug generation with accented names`
- `refactor(events): extract date validation helper`
- `docs(todo): mark reservations module as in progress`
- `chore(deps): bump zod to 4.4.0`

## Prohibido

- Mensajes multilinea (ni `-m "..." -m "..."` ni HEREDOCs con body).
- Trailers `Co-Authored-By:` o cualquier atribución a Claude / IA.
- Mezclar cambios no relacionados en un solo commit ("misc fixes", "various updates").
- `git add .` o `git add -A` cuando hay múltiples grupos de cambios.
- `git add -p` ni cirugía de hunks. La unidad mínima de commit es el archivo.
