# Botones de enlace, botón de ícono xs y piezas del calendario

**Released:** 2026-11-03

## Summary

Varios botones seguían armados a mano después de la limpieza de la v0.5: los que se ven como enlace de texto (`bg-transparent border-0 p-0 text-brand hover:underline`), los íconos en línea dentro de etiquetas y chips, y el chip de evento y el "+N more" que los tres calendarios copiaban. `uiButton` suma las variantes `link` y `link-danger`, `uiIconButton` el tamaño `xs`, y `month-calendar` dos piezas nuevas que comparten Diary, My Shelf y Platinums. Es solo frontend.

## Highlights

- Enlaces de texto con foco visible y área táctil de 44px sin depender de `tap-area`.
- Íconos en línea de 20px con área táctil de 44px.
- Un solo chip de evento y un solo "+N more" para los tres calendarios; el de My Shelf gana `aria-label`.

## Added

- `uiButton` `variant="link"` y `variant="link-danger"` (`styles/ui.css`): sin padding, alto ni borde, tamaño de fuente heredado, subrayado en hover y área táctil por `::after`. Un `<span data-link-label>` hijo lleva su propio color y recibe el subrayado.
- `uiIconButton` `size="xs"`: 20px visibles, área táctil de 44px por `::after`.
- `CalendarEventChip` (`shared/components/month-calendar/calendar-event-chip.ts`): `title`, `toneClass`, `ariaLabel`, `showTitle`, `roundLeft`, `roundRight` y salida `pressed`; proyecta un ícono antes del título.
- `CalendarDayOverflow` (`calendar-day-overflow.ts`): `count`, `tone` (`brand` o `platinum`) y salida `pressed`.

## Changed

- Variante `link` en `ListItemRow`, "Show history" del modal del backlog, "Report missing" de `BacklogReferenceFields`, "View in Diary" de `BacklogCalendar`, "try another email" de `ForgotPassword` y "Read more/less" de `ExpandableText`; `link-danger` en el aviso de campos faltantes del modal del backlog.
- `uiIconButton` en `ActivityDeleteButton` (`circle`, `tone="danger"`), la X de `MoodTagsInput` y los íconos de información del modal del backlog y de `BacklogReferenceFields` (`xs`, `tone="accent"`).
- "See all" de `PosterShelf` pasa a `uiButton variant="ghost"`, junto con su enlace gemelo.
- `BacklogCalendar`, `GameShelfCalendar` y `PlatinumCalendar` usan `CalendarEventChip` y `CalendarDayOverflow`.
- `docs/context/frontend.md`: variantes y tamaños de `uiButton` y `uiIconButton`, y fila de `MonthCalendar` con las piezas nuevas.

## Fixed

- El chip de `GameShelfCalendar` no tenía `aria-label`.
- Los botones de estado de `ListItemRow` se subrayaban en color de marca y no en el del estado.

## Files of interest

- `apps/web/src/styles/ui.css`
- `apps/web/src/app/shared/ui/button/ui-button.ts`
- `apps/web/src/app/shared/ui/icon-button/ui-icon-button.ts`
- `apps/web/src/app/shared/components/month-calendar/calendar-event-chip.ts`
- `apps/web/src/app/shared/components/month-calendar/calendar-day-overflow.ts`

## Commits

- `192c49b9` — feat(web): add link button variants and xs icon button size
- `45aee2e3` — refactor(web): share the calendar event chip and day overflow button
- `b1372045` — refactor(web): use link buttons in list rows, forgot password and expandable text
- `346fe04e` — refactor(backlog): use link and icon buttons in the backlog modal
- `ab17379c` — refactor(web): use shared icon and ghost buttons in shared components
- `7326177f` — docs(frontend): document link buttons, xs icon button and calendar pieces
- `8faca2bd` — fix(lists): underline status links in the status color
