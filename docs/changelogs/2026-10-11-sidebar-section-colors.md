# Colores por sección en el sidebar

**Released:** 2026-10-11

## Summary

Los íconos del sidebar tenían todos el mismo color neutro y costaba distinguir las secciones de un vistazo. Ahora cada sección tiene su propio color, definido como token por tema para que combine con los tres temas. El ítem activo sigue usando el color brand. De paso, los links vuelven a respetar sus clases de color de Tailwind: la regla global `a { color: brand }` estaba fuera de cualquier capa y le ganaba a todas las utilidades, así que los labels del sidebar y otros links salían en brand aunque declararan otro color.

## Added

- Tokens `--color-nav-*` (feed, backlog, queue, shelf, wishlist, favorites, saved-views, tags, browse, lists, users, admin, more) en `@theme` y en cada tema (`refined-dark`, `midnight-cyan`, `twilight-arcade`). Generan las utilidades `text-nav-*`.
- `NAV_SECTIONS` en `layout/nav-sections.ts`: definición tipada de las secciones e ítems del sidebar (ruta, ícono, label, tooltip, color, rol requerido) y `visibleNavSections(role)`, que filtra por rol y resuelve el título Admin/Moderator.

## Changed

- `layout.html` arma el sidebar con `@for` sobre `NAV_SECTIONS` y un `ng-template` por sección, en vez de un bloque repetido por ítem. La sección "More" sigue fija abajo.
- Los íconos inactivos pasan de `opacity-70` a `opacity-80` y usan el color de su sección. Admin comparte un solo color apagado y "More" queda neutro.

## Fixed

- Las reglas base de `a` y `a:hover` en `styles.css` pasan a `@layer base`. Los links con una clase de color propia (`text-fg-secondary`, `text-fg-muted`, `text-fg`, `text-inherit`) la muestran: labels del sidebar, usuario y settings del sidebar, footer de atribuciones, tabs de settings y tarjetas de stats del perfil. Los links sin clase de color siguen en brand.

## Files of interest

- `apps/web/src/app/layout/nav-sections.ts` — secciones del sidebar y filtro por rol.
- `apps/web/src/app/layout/layout.html` — template del sidebar.
- `apps/web/src/styles.css` — tokens `--color-nav-*` y capa base de los links.

## Commits

- `d5166601` — feat(layout): color sidebar icons by section
