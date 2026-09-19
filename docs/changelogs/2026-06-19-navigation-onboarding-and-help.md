# Navegación, onboarding y ayuda

**Released:** 2026-06-19

## Summary

Revisión de la navegación y de la primera experiencia. El sidebar se reorganiza en secciones, las páginas principales de la biblioteca cambian de nombre y sus estados vacíos explican para qué sirven, y se suma un tour de bienvenida conectado con la página de ayuda. Aparecen dos páginas nuevas: About y What's New.

## Highlights

- Sidebar agrupado en Library, Discover y More, con tooltips.
- Tour de tres pasos en el primer login, reabrible desde el botón de ayuda.
- Páginas About y What's New.

## Added

- Tour de onboarding (`onboarding-tour`) con estado en `core/services/onboarding.ts`, enlazado con la página de ayuda en las dos direcciones.
- Páginas `about` y `whats-new`, con cards de íconos de color. What's New suma las entradas del 2026-06-18 y 2026-06-19 y paginación.

## Changed

- Sidebar reorganizado en Library, Discover y More (ayuda, What's New y About).
- Tour y ayuda comparten un único botón.
- Nuevos nombres para las páginas de la biblioteca, los tabs del perfil y la configuración de privacidad; estados vacíos reescritos.
- La guía de ayuda usa una tabla de contenidos lateral fija; su sección About pasa a ser un enlace a la página nueva.

## Fixed

- URL del autor y email de contacto en About; se quita OpenCritic de las fuentes.

## Files of interest

- `apps/web/src/app/layout/layout.html`
- `apps/web/src/app/shared/components/onboarding-tour/onboarding-tour.ts`
- `apps/web/src/app/core/services/onboarding.ts`
- `apps/web/src/app/features/about/about-page.ts`
- `apps/web/src/app/features/whats-new/whats-new-page.ts`
- `apps/web/src/app/features/help/help-page.html`

## Commits

- `b06ec8e3` — refactor(layout): regroup sidebar into library and discover with tooltips
- `0c376078` — feat(views): rename main library pages and rewrite empty states with purpose
- `1d24c2c2` — feat(public-profile): apply new naming to profile tabs, settings and help
- `a7078327` — feat(onboarding): add three-step tour shown on first login with manual reopen
- `6a594913` — feat(onboarding): redesign tour into compact icon grid with shorter copy
- `cee112ff` — refactor(onboarding): extract state to shared service for cross-component access
- `1b714e71` — feat(onboarding): bridge tour and help page in both directions
- `f13afdec` — refactor(layout): merge tour and help into single help button
- `13f4eea0` — feat(misc): add about and whats-new standalone pages
- `a306b727` — refactor(layout): group help, whats new and about under a More sidebar section
- `6963fcdb` — refactor(help): replace duplicated about section with link to about page
- `b4b55ad3` — feat(about, whats-new): warm both pages with colored icon cards
- `04c89b4f` — fix(about): correct author url, contact email and drop opencritic from sources
- `bf13807a` — refactor(help): restructure guide with sticky toc sidebar to use horizontal space
- `f59f241f` — feat(whats-new): add 2026-06-18 release entries for profile and lists updates
- `5f4cdccb` — feat(whats-new): add 2026-06-19 entries with pagination
