# Restos del diseño previo a la v0.5

**Released:** 2026-10-14

## Summary

Una auditoría de la web encontró pantallas y componentes que seguían con patrones anteriores a la v0.5: avisos de error y etiquetas copiados a mano, botones con clases largas en vez de `uiButton`, colores hex o de la paleta de Tailwind, skeletons armados con divs y objetivos táctiles bajo 44 px. Se corrigen en cuatro bloques y se agregan las piezas compartidas que faltaban. También se corrige `ui-skeleton`, cuyas variantes `rect` y `circle` medían 0 px de alto, por lo que varios estados de carga no se veían. Es solo frontend. Admin y Register quedan fuera.

## Highlights

- Avisos de error con `ui-alert` y etiquetas de formulario con `uiFieldLabel`.
- Un solo logo (`AppLogo`) e insignias de rol con tokens.
- Botones de 44 px en táctil en tarjetas, filas de listas y carruseles.
- Los estados de carga con `ui-skeleton` vuelven a verse.

## Added

- `UiAlert` (`shared/ui/alert`): `tone` `danger` / `warning` / `info` / `success`, ícono por tono, `role="alert"` o `status`.
- `UiFieldLabel` (`shared/ui/label`): directiva `[uiFieldLabel]` con el estilo eyebrow para `<label>` y `<legend>`.
- `AppLogo` (`shared/components/app-logo`): `size` `md` / `lg` y `wordmark`.
- `core/utils/role-badge.ts`: `roleBadge` y `elevatedRoleBadge`.
- `backlogStatusCalendarBarClass` en `shared/utils/backlog-status.ts`; los helpers de estado aceptan `string`.

## Changed

- Diálogos de listas, tags, backlog, My Shelf, reporte del juego y agregar a lista, y login: avisos con `ui-alert` (el login usaba `text-red-300`) y 19 etiquetas con `uiFieldLabel`.
- Clases de estado unificadas en `backlog-modal`, `queue-add-modal`, `backlog-calendar` y la actividad social del juego.
- `surprise-me`: vacío y error con `ui-plain-empty-state` y "Try again".
- Detalle del juego: skeleton de carga, acciones de la biblioteca con `uiButton`, chips del hero con tracking v0.5, `ui-avatar` en la actividad social. El botón de estado pasa a fondo neutro con ícono y texto del color del estado.
- Browse: CTA del hero con `uiButton` y flechas del carrusel con `uiIconButton`.
- Perfil público: skeleton, botones del hero con `uiButton` y carga de seguidores con skeleton.
- Shell: logo compartido en sidebar, topbar, guest shell y login; moderador en `info` en vez de un morado hex; cerrar sesión con `uiIconButton`; CTA del guest shell con `uiButton`.
- What's new y Privacy: error con `ui-empty-state`; Privacy usa `tap:` para sus 44 px.
- Help: barras de ejemplo con `ui-progress`. Up Next: "Start playing" con `uiButton`.
- Componentes compartidos: botones táctiles en `BacklogEntryCard`, flechas de `PosterShelf` con `uiIconButton`, insignias de `ListCard` unificadas y su progreso con `ui-progress`, skeletons al buscar en `GameSearchStep` y en el detalle de lista, acción del toast con `uiButton`, avatares co-op con `ui-avatar`.
- `pointer-coarse:` usado para tamaños pasa a `tap:` en `mood-tags-input`, `backlog-status-pills` y el pie de atribución.
- `MonthCalendar`: el número de hoy usa `text-canvas` (cumple AA en los tres temas).
- `docs/context/frontend.md`: piezas nuevas y una nota sobre `styles/ui.css`, que no está en una capa de cascada y gana a las utilidades de Tailwind.

## Removed

- `PersonalStats` (`shared/components/personal-stats`), sin uso.

## Fixed

- `UiSkeleton` es `block` y sus variantes `rect` y `circle` ocupan el alto del host.

## Files of interest

- `apps/web/src/app/shared/ui/alert/ui-alert.ts`
- `apps/web/src/app/shared/ui/label/ui-field-label.ts`
- `apps/web/src/app/shared/ui/skeleton/ui-skeleton.ts`
- `apps/web/src/app/shared/components/app-logo/app-logo.ts`
- `apps/web/src/app/core/utils/role-badge.ts`

## Commits

- `4065264f` — feat(ui): add alert and field label primitives
- `4ea90084` — refactor(backlog): reuse shared status helpers in calendar and queue modal
- `7071fd3e` — refactor(lists): use shared alert and field labels in list dialogs
- `aaeebac3` — refactor(tags): adopt shared alert, labels, progress and icon buttons
- `70559af8` — refactor(backlog): use plain empty states with try again in surprise me
- `458a2d04` — refactor(backlog): align my games dialogs and saved view cards with v0.5 ui
- `226b17ff` — refactor(game-shelf): use shared alert in shelf modal
- `00602bfb` — refactor(auth): use shared alert and icon button on login
- `6afd228f` — refactor(game-detail): use ui-skeleton for loading state and eyebrow report label
- `09658b07` — refactor(game-detail): migrate library actions to uiButton
- `3063e816` — refactor(game-detail): align hero chips and franchise toggle with v0.5 tokens
- `37d7f2f5` — refactor(game-detail): use ui-avatar and shared status helpers in social activity
- `fd13f831` — style(game-detail): unify pill tracking, eyebrow labels and count pill token
- `81430b75` — refactor(games-browse): migrate hero cta and carousel controls to ui buttons
- `a071f89e` — refactor(layout): share app logo and token role badge across shells
- `03ea821f` — refactor(public-profile): use shared buttons, skeletons and role badge
- `6168ab23` — style(web): use tap variant for attribution footer touch sizes
- `71d032b0` — refactor(web): use shared empty state for whats-new and privacy errors
- `7119d850` — refactor(help): render example bars with ui-progress
- `a32f2023` — style(settings): align this device pill tracking with eyebrow style
- `1a5d9bce` — refactor(queue): use uiButton for start playing cta
- `ab132131` — refactor(backlog): add touch targets, ui-avatar and tokens to entry card
- `f563518b` — refactor(web): use tap variant for touch sizing in mood tags and status pills
- `141221c8` — refactor(web): use color tokens on the game cover card action bar
- `34dca33c` — refactor(web): use uiIconButton for poster shelf arrows
- `2fa14dff` — refactor(lists): unify list card badges and use ui-progress
- `f02aba13` — refactor(web): show skeleton rows while searching games
- `a4092d8d` — fix(web): use canvas text on today marker and eyebrow tracking in month calendar
- `54b4dd94` — style(web): align review and rating labels with the eyebrow style
- `203b53f8` — refactor(web): use uiButton for the toast undo action
- `6830f622` — refactor(backlog): use ui-avatar for co-op members in the table
- `4056d903` — refactor(lists): use uiIconButton for list item row actions
- `bf3bdeb1` — refactor(lists): show skeleton rows while searching games to add
- `ce06d210` — chore(web): remove unused personal-stats component
- `123ff683` — fix(ui): make skeleton rect and circle fill their host
- `b977e9bc` — refactor(game-detail): use shared alert and field label in report and list dialogs
- `8ebbff3c` — docs(web): document alert, field label, app logo and ui css layering
