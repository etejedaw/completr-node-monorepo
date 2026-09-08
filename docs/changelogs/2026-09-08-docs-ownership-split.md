# Separación de dueños en la documentación

**Released:** 2026-09-08

## Summary

La documentación del repo mezclaba dos cosas con dueños distintos: cómo funciona el código y qué decidió el producto. Esta entrega las separa. `docs/` queda como referencia autocontenida de lo que el backend hace cumplir —enums, constraints, validaciones, códigos de respuesta, comportamientos automáticos— y todo lo que es decisión de producto o planificación sale del repo. `CONTEXT.md` desaparece porque su contenido técnico ya estaba en `docs/` en mejor forma, y `docs/business-rules.md` pasa a `docs/invariants.md` con un alcance explícito: describe el mecanismo, no la decisión detrás. El criterio para cortar es quién manda sobre el dato — si lo decide la implementación va en `docs/`, si lo decide el producto no se documenta acá.

## Highlights

- `docs/invariants.md` reemplaza a `docs/business-rules.md`: mismas reglas atómicas, alcance limitado a lo que el código hace cumplir.
- `CONTEXT.md` eliminado. Sus conceptos de dominio ya vivían duplicados y desactualizados frente a `docs/`.
- Tres datos falsos corregidos contra el código, no contra la documentación previa.
- Pasos 6 y 7 en el checklist de post-edición, para que la documentación no vuelva a quedarse atrás del código.

## Changed

- **`docs/business-rules.md` → `docs/invariants.md`.** Se conservan las reglas de enforcement (validaciones del backlog, constraints de queue/wishlist/favorites, comportamiento de listas y list-items, saved filters, reviews, scores y duraciones, ratio, privacidad, activity feed, auth y sesiones, rate limiting, búsqueda de juegos). La intro declara el alcance: mecanismo, no decisión.
- **Valores de límites y permisos apuntan al código.** Los topes por rol se resuelven en las constantes `FREE_*_LIMIT` de cada service y los permisos en el `authMiddleware(...)` de cada `*.routes.ts`. No se replican en prosa para que no queden desfasados.
- **`docs/context/conventions.md`** suma dos pasos obligatorios de post-edición: actualizar `docs/invariants.md` al cambiar un enum, constraint, validación o auto-comportamiento; y reconocer los cambios de tope, permiso o visibilidad como decisión de negocio, que no se documenta en `docs/`.
- **`docs/context/providers.md`** documenta solo el provider que existe (`src/rawg/`) y deja la regla vigente de estructura (un provider por carpeta en `src/`).
- **`docs/README.md`** y **`docs/architecture.md`** reordenan su índice y sus enlaces relacionados alrededor de `invariants.md`.
- **`README.md`** apunta a `docs/` para convenciones y reglas, sin desviar a documentación externa.

## Removed

- **`CONTEXT.md`** (197 líneas). Todo su contenido técnico estaba ya en `docs/`, en general más preciso; el resto era producto y salió del repo.
- **Tabla de providers planeados** en `docs/context/providers.md`. Marcaba `src/hltb/`, `src/metacritic/` y `src/steam/` como pendientes: ninguno existe, y el plan vigente para fuentes externas es distinto al que esa tabla insinuaba.

## Fixed

Tres datos que la documentación afirmaba y el código contradecía:

- **Faltaba el estado `endless`** en el enum documentado de `Backlog.status`. Son cinco, no cuatro. Se documenta además su comportamiento real: cuenta como cerrado en el progreso de franquicias y listas, pero como activo en los filtros por actividad, donde `finishedAt` se coalesce a `CURRENT_DATE`.
- **El modelo de privacidad estaba entero desactualizado.** Se documentaban flags booleanos (`isPublic`, `isWishlistPublic`, …) que ya no existen. Hoy son ocho campos `VisibilityLevel` (`private`, `friends`, `public`) resueltos por `canView()`, donde el nivel `friends` exige seguimiento mutuo, más `acceptFollowRequests`. La regla `visible = User.isPublic AND ListFollower.isVisible` ya no aplica.
- **`wishlistRemoved` no es el nombre del campo.** La respuesta de update de backlog devuelve `queueRemoved` (`backlog.controller.ts:176`). Se corrige también el disparador: el auto-remove del queue ocurre al pasar a `playing`, `completed`, `abandoned` **o** `endless`.

También se completa la lista de recursos con tope por rol, que omitía `queue` y `list-items`.

## Migration

- Cualquier enlace a `docs/business-rules.md` pasa a `docs/invariants.md`. El rename se hizo con `git mv`, así que el historial del archivo se preserva.
- Los enlaces a `CONTEXT.md` desde `README.md`, `docs/README.md` y `docs/architecture.md` fueron reapuntados. Los changelogs anteriores que lo mencionan quedan intactos: son registro histórico.
- Para el valor exacto de un límite o los permisos de un rol, la fuente ahora es el código, no un documento.

## Files of interest

- `docs/invariants.md` — el archivo central de esta entrega.
- `docs/README.md` — el índice, que declara el alcance de la carpeta.
- `docs/context/conventions.md` — el checklist de post-edición ampliado.
- `docs/context/providers.md` — providers implementados y regla de estructura.

## Commits

- `1e6b4cf` — docs(invariants): rename business-rules and scope it to code invariants
- `7adc165` — docs: drop CONTEXT.md and point references to affine
- `7c55433` — docs(claude): rewrite project instructions around affine as source of truth
- `8f9412e` — chore(skills): update changelog skill doc references
- `9a9e945` — chore(mcp): switch affine env vars to email and password
- `f0c2b52` — docs(conventions): add invariants and business-decision steps to post-edit checklist
- `2c647f1` — docs: keep planning and external references out of the public docs
- `e2ff317` — docs(claude): add tech debt doc and restrict affine references to this file
- `03688b7` — chore(skills): note that changelogs are public in changelog skill
