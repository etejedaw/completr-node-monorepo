---
name: release-changelog-public
description: Write the user-facing release entries of Completr in apps/landing/src/content/releases/ (shown on the landing's /changelog and on the app's "What's new" page), derived from the technical changelogs in docs/changelogs/. Trigger when the user asks to "publicar el changelog", "actualizar el changelog público", "escribir la entrada de la landing" or "What's new", or right after release-changelog generated technical entries that include changes a user notices. Never rewrites historical entries.
---

# Release Changelog Public

Genera las entradas del **changelog público**: el que ven los usuarios en `https://www.completr.app/changelog` y en la página "What's new" de la app. Formato en [`release-template.md`](./release-template.md).

Esta skill es la segunda mitad de un par. `release-changelog` lee los commits y escribe el changelog técnico en `docs/changelogs/`. Esta skill **no lee commits ni agrupa trabajo**: parte de esos changelogs técnicos y decide qué de lo que contienen lo nota un usuario y cómo contárselo. Si no hay changelog técnico para lo que quieres publicar, corre primero `release-changelog`.

## Contexto

- **Dónde se ve:** `src/content/releases/` alimenta `/changelog` y `/changelog.json` de la landing. La API reexpone el JSON en `GET /changelog` y `apps/web` lo muestra en "What's new". Detalle en `docs/context/landing.md`.
- **El schema manda.** Los campos viven en `apps/landing/src/content.config.ts` y el build falla si no se cumplen. No se inventan campos nuevos.
- **Es un subconjunto del técnico.** Todo changelog técnico tiene su archivo en `docs/changelogs/`; solo los que un usuario nota tienen además entrada pública.
- **Es copy de producto, no documentación.** Se escribe para usuarios, no para quien lee el código.
- **Las entradas son públicas y el repo también** (AGPLv3): no mencionan herramientas ni documentos internos de planificación.

## Flujo

### 1. Encontrar los changelogs técnicos pendientes

- Fecha de la última entrada pública: la más reciente en `apps/landing/src/content/releases/` (el prefijo del nombre).
- Lista los changelogs de `docs/changelogs/` cuyo `Released` es igual o posterior a esa fecha.
- Las entradas públicas no enlazan a su changelog técnico, así que **la fecha es solo una heurística**. Para los changelogs de la misma fecha que la última entrada pública, abre esa entrada y pregunta al usuario si ya cubre el cambio.
- Si no queda ninguno pendiente, avisa y termina sin generar nada.

### 2. Decidir qué es visible para el usuario

Lee `Summary` y `Highlights` de cada changelog pendiente (y `Added / Changed / Fixed` si hace falta) y clasifica.

**Lleva entrada pública** cuando el usuario de la app nota el cambio: una feature nueva, un cambio de UX, una mejora visible de rendimiento o un bug que sufría.

**No lleva** refactors, tooling, dependencias, CI, Docker, deploy, documentación, cambios internos de la API sin efecto visible ni cambios de la propia landing. Ante la duda, pregunta.

### 3. Agrupar en entradas

- Normalmente un changelog técnico visible da una entrada pública.
- Varios cambios pequeños que el usuario percibe como "arreglos" van juntos en una entrada con `tag: Fixes`.
- Varios changelogs técnicos que cuentan la misma historia para el usuario van en una sola entrada.
- Una versión grande (un tag `vX.Y.Z` que cierra una fase) puede tener además su propia entrada de resumen con `tag: Launch`.

### 4. Proponer y confirmar

Muestra al usuario:

- Qué changelogs técnicos quedan sin entrada pública, con la razón.
- Cuántas entradas salen, con nombre de archivo tentativo y qué changelogs técnicos cubre cada una.
- Cuáles son `Fixes` y si alguna es `Launch`.

**Espera confirmación.** Si el usuario reagrupa, ajusta y vuelve a mostrar.

### 5. Redactar las entradas

Una por grupo confirmado, siguiendo [`release-template.md`](./release-template.md). El archivo solo tiene frontmatter, sin cuerpo.

**Archivo:** `apps/landing/src/content/releases/YYYY-MM-DD-NN-<slug>.md`

- `YYYY-MM-DD`: el `Released` del changelog técnico (si cubre varios, el más reciente).
- `NN`: correlativo del día, con dos dígitos. Si ya hay archivos con esa fecha, usa el siguiente número libre.
- `<slug>`: kebab-case en inglés, corto (`franchise-tracker`, `coop-runs`).

**Campos:**

| Campo              | Idioma  | Dónde se ve                          | Regla                                                                                                                   |
| ------------------ | ------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `date`             | —       | Landing y app                        | `YYYY-MM-DD`                                                                                                            |
| `order`            | —       | —                                    | Desempata entradas del mismo día: **la más alta se muestra primero**. La entrada más importante del día lleva el mayor. |
| `tag`              | Inglés  | Landing y app                        | Una o dos palabras (`Sagas`, `Social`, `Fixes`, `Launch`). Reutiliza un tag existente si encaja.                        |
| `title`            | Inglés  | Landing y app                        | Una línea. Lo que gana el usuario, no el nombre técnico. Comillas si lleva `:` o `—`.                                   |
| `icon`             | —       | Landing y app                        | Nombre de [Material Icons](https://fonts.google.com/icons?icon.set=Material+Icons) en snake_case.                       |
| `tint`             | —       | Landing y app                        | `brand`, `purple`, `warning`, `success` o `danger`. `warning` para fixes, `brand` para features principales.            |
| `landing.pitch`    | Español | Landing (`/` y `/changelog`)         | Una o dos frases. Qué puede hacer ahora el usuario.                                                                     |
| `landing.featured` | —       | —                                    | `true` solo en releases grandes (versión nueva, feature principal). Si no, se omite.                                    |
| `highlights`       | Inglés  | App ("What's new", vía `/changelog`) | De 2 a 6 ítems con `icon`, `tint` y `text`. Cada `text` es un cambio concreto contado desde el lado del usuario.        |

**Tono:** para usuarios, no para devs. Sin nombres de endpoints, módulos, tablas, commits ni librerías. En segunda persona o impersonal ("You can now…", "Ahora puedes…"). Usa los nombres de secciones que ve el usuario en la app (`My Games`, `Up Next`, `Want to Get`), no los internos (`backlog`, `queue`, `wishlist`).

Toma como referencia de estilo las entradas más recientes de `apps/landing/src/content/releases/`.

### 6. Revisar el texto con el usuario

`title`, `pitch` y `highlights` se muestran al usuario y se ajustan antes de dejar los archivos listos, igual que los grupos del paso 4.

### 7. Verificar

- `npm run build:landing` pasa: valida el frontmatter contra el schema.
- Ninguna entrada existente fue tocada.

**No hace commit.** Deja los archivos en el working tree para que el usuario los revise.

## Decisiones que toma esta skill (sin preguntar)

- Que un changelog técnico sin cambios visibles no lleva entrada pública.
- Nombre del archivo (`NN` = siguiente libre del día) y `order` (mayor = más importante).
- La estructura de `release-template.md`, sin secciones ni campos nuevos.

## Decisiones que NUNCA toma esta skill (siempre pregunta)

- Si un cambio dudoso merece entrada pública, y si va sola o dentro de una entrada `Fixes`.
- Si dos changelogs técnicos se cuentan en una entrada o en dos.
- Si una entrada es `Launch` o lleva `landing.featured`.
- El texto final de `title`, `pitch` y `highlights`.

## Reglas

- **Nunca tocar entradas ya publicadas.** Si algo cambia después, va en una entrada nueva. Las viejas son historia y deben quedar fieles a la fecha que llevan.
- **`pitch` en español; `tag`, `title` y `highlights` en inglés.** Es la única mezcla de idiomas del repo y es intencional: la landing es en español y la app, en inglés.

## Anti-patterns

- Entrada pública para cambios internos (refactor, tooling, deploy) o con jerga técnica.
- `pitch` en inglés o `title` / `highlights` en español.
- Copiar el `Summary` del changelog técnico: está escrito para devs.
- Inventar campos o secciones que el schema no define.

## Checklist final

- [ ] Cada changelog técnico pendiente tiene entrada pública o el usuario decidió que no la lleve.
- [ ] El usuario revisó `title`, `pitch` y `highlights`.
- [ ] No se modificó ninguna entrada existente.
- [ ] `npm run build:landing` pasa.
