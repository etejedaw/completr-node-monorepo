# Rediseño de páginas informativas

**Released:** 2026-10-12

## Summary

Help, About, What's new, Privacy y las páginas de error comparten el mismo lenguaje visual y componentes. Es solo frontend. Se extraen `InfoPageLinks` (navegación entre páginas informativas), `PageToc` con `SectionScrollSpy` (índice con seguimiento de sección), el modelo y la entrada de release de What's new y un layout común de error. Además se fija una sola vez el espaciado inferior de `LibraryHero` y se eliminan los ajustes por vista.

## Highlights

- Help y Privacy con índice de contenidos y seguimiento de la sección activa.
- What's new con modelo de release y entradas propias.
- 403 y 404 comparten un único layout.
- El pie de atribución lista las fuentes de datos como enlaces.

## Added

- `shared/components/info-page-links`.
- `shared/components/page-toc` y `section-scroll-spy.ts`.
- `features/whats-new/release.model.ts` y `components/release-entry`.
- `features/error-pages/error-page.ts`.

## Changed

- `about-page`, `help-page`, `whats-new-page` y `privacy` se renderizan con los componentes anteriores.
- `forbidden` y `not-found` usan `error-page`.
- `attribution-footer` enlaza cada fuente de datos.
- `library-hero` estandariza su espaciado inferior y las vistas dejan de sobrescribirlo.

## Removed

- `help/components/help-toc.ts`, reemplazado por el `PageToc` compartido.

## Files of interest

- `apps/web/src/app/shared/components/page-toc/`
- `apps/web/src/app/shared/components/info-page-links/info-page-links.ts`
- `apps/web/src/app/shared/components/library-hero/library-hero.ts`
- `apps/web/src/app/features/whats-new/`
- `apps/web/src/app/features/error-pages/`

## Commits

- `86e63edc` — feat(shared): add info page links component
- `55fdd745` — feat(about): render about page with info page links
- `e265b2ae` — feat(help): add table of contents component
- `7f7f7323` — feat(help): render help page with table of contents and info links
- `c7c82d3c` — feat(whats-new): add release model and entry component
- `54ef3079` — feat(whats-new): render whats-new page with release entries
- `9c3694ec` — feat(shared): list data sources as links in attribution footer
- `62a16d7d` — refactor(shared): standardize library hero bottom spacing
- `f984a543` — refactor(web): remove per-view hero spacing overrides
- `05d0ab93` — feat(shared): add page toc and section scroll spy
- `e8d96990` — refactor(web): use shared page toc in help page
- `94ff37f1` — feat(web): redesign legal privacy page with section navigation
- `7dfb874e` — refactor(web): share error page layout across 403 and 404
