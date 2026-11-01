# Help al día con Rewind, platinos, sagas, exportación y privacidad

**Released:** 2026-11-01

## Summary

La guía "How Completr works" (`/help`) no mencionaba varias features recientes: el Rewind, la página de platinos, la página de sagas en Discover, la exportación de colecciones ni las secciones de privacidad nuevas. Se agrega una sección Rewind al índice, se describen Platinums y Sagas en el mapa de la app, se suma la nota de exportación y se nombran los niveles de visibilidad igual que en Settings → Privacy.

## Added

- Sección "07 · Rewind" ("Your year in games, once a year"): qué resume y, en una lista de temas, que lo genera el usuario desde su perfil y nadie lo ve antes, cuándo se abre cada año, el idioma, las regeneraciones, cómo se comparte y los extras Premium. El botón "Open my Rewinds" lleva al archivo de Rewinds del propio usuario (`rewindLink`, con `AuthService`) o a `/profile` si no hay sesión.
- Entrada de Platinums en el mapa de la app y texto nuevo para Sagas como página de Discover.
- Nota de exportación en la sección de colección: qué vistas se descargan como CSV, que el archivo sigue los filtros, la búsqueda y el orden activos, y que JSON es un perk Premium.
- Tests de Help (`help-page.spec.ts`) para la sección Rewind, Platinums, la nota de exportación y las secciones de privacidad.

## Fixed

- Los niveles de visibilidad se llamaban "Public" y "Private" en Help y "Everyone" y "Only you" en Settings. Help usa ahora los nombres de `VISIBILITY_OPTIONS`, y un test lo compara contra esa constante.

## Files of interest

- `apps/web/src/app/features/help/help-page.html`
- `apps/web/src/app/features/help/help-page.ts`

## Commits

- `c6806af3` — feat(help): add rewind section and bring collection, export and privacy up to date
- `5bde262a` — test(help): cover rewind, platinums, export note and privacy sections
- `cce13f96` — fix(help): name visibility levels as the privacy settings do
