# Tonos de eyebrow y tokens de sombra

**Released:** 2026-11-03

## Summary

Después de la limpieza de restos previos a la v0.5 quedaban dos patrones copiados a mano en toda la web: el eyebrow de marca (`text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-brand`), que `uiEyebrow` no cubría porque solo tenía el tono gris, y una docena de sombras arbitrarias `shadow-[...]` repetidas entre componentes. `uiEyebrow` gana un input `tone` y las sombras repetidas pasan a tokens `--shadow-*` y `--drop-shadow-*` del `@theme` de `styles.css`. Es solo frontend.

## Highlights

- Un solo eyebrow para títulos de sección: `uiEyebrow` con `tone` `muted`, `brand` o `premium`.
- Diez tokens de sombra con nombre en lugar de valores arbitrarios repetidos.
- Las piezas compartidas (menús, selectores, calendario, panel de filtros, diálogo, cajón, hoja inferior) usan `uiEyebrow` en vez de copiar sus clases.

## Added

- `UiEyebrow.tone` (`UiEyebrowTone`: `muted` por defecto, `brand`, `premium`) y `ui-eyebrow.spec.ts`. `muted` mide 0.625rem con `tracking-[0.16em]`; `brand` y `premium`, 0.6875rem con `tracking-[0.2em]`, como el eyebrow de `LibraryHero`.
- Tokens en `@theme`: `--shadow-popover`, `--shadow-table`, `--shadow-sheet`, `--shadow-dock`, `--shadow-card`, `--shadow-toast`, `--shadow-ring-brand`, `--shadow-tone-icon`, `--drop-shadow-hero` y `--drop-shadow-cover`.

## Changed

- Eyebrow de marca con `uiEyebrow tone="brand"` en Help, Privacy, la página de error, Franchises, Rewind, `QueueNextCard`, `AuthPage`, `AuthShowcase`, `AdminGameEditor`, el perfil público, `LibraryHero`, `MonthCalendar`, `PosterShelf`, `GameSearchStep`, `UiDialog`, `UiDrawer` y `UiBottomSheet`; `GiftOfferCard` usa `tone="premium"`.
- Eyebrow gris con `uiEyebrow` en `ActionMenu`, `OptionPicker`, `MultiOptionPicker`, `MonthYearPicker`, `FilterSection`, `StarRating`, la cabecera de días de `MonthCalendar` (con `table-cell`), `PageToc`, `RatioSummary` y `SelectedGameRow`.
- Los eyebrows de 0.5625rem pasan al tamaño de `muted` (0.625rem) y los de marca que medían 0.625rem, a 0.6875rem.
- Sombras: `shadow-popover` en los menús flotantes y en `UiDatePicker`; `shadow-table` en las tablas de Hardcore, Platinums y My Shelf; `shadow-sheet` en `UiBottomSheet` y en `UiDialog` en mobile; `shadow-dock` en `SettingsSaveBar` y la barra fija de la ficha del juego; `shadow-card` en `BacklogEntryCard`; `shadow-toast` en los toasts; `shadow-ring-brand` en el buscador global, `UiSearchBar` y los formularios resaltados de reseña y de lista; `shadow-tone-icon` en el halo del ícono de `UiDialog`, `UiDrawer` y `UiBottomSheet`; `drop-shadow-hero` en los títulos de héroe y `drop-shadow-cover` en los de `ListCard` y `FranchiseCard` (este último pasa de `text-shadow` a `drop-shadow`).
- `docs/context/frontend.md`: fila de `UiEyebrow`, patrón "Eyebrow + título" y viñeta de sombras en "Temas y tokens", con la regla de que una sombra usada en más de un sitio pasa a token.

## Files of interest

- `apps/web/src/app/shared/ui/label/ui-eyebrow.ts`
- `apps/web/src/styles.css`
- `docs/context/frontend.md`

## Commits

- `2c792d7d` — feat(web): add tone input to uiEyebrow
- `4dde658d` — refactor(web): add shadow tokens for popovers, tables, sheets and docks
- `a6bb4705` — docs(web): document eyebrow tones and shadow tokens
- `b26930d0` — refactor(web): adopt uiEyebrow tones and shadow tokens across components
- `b91ca85a` — refactor(web): add card, toast, ring, tone icon and text drop shadow tokens
- `845ae258` — refactor(web): use shadow tokens instead of repeated arbitrary shadows
- `5c12400b` — docs(web): document link label underline and the new shadow tokens
