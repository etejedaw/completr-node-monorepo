# Tipografía, marca y piezas compartidas de biblioteca

**Released:** 2026-10-14

## Summary

Cierre del rediseño v0.5 en dos frentes. Primero, una tanda de refactors sin cambio de comportamiento que saca a componentes compartidos lo que My Games, Up Next, la biblioteca pública y el perfil repetían: pastillas de estado, tabla Hardcore, sección de lista de Up Next, estados vacíos y selector de vista. Segundo, la identidad visual: la app y la landing pasan a Chakra Petch + Manrope autoalojadas, cada tema vive en un solo archivo de tokens, y se regeneran favicon, íconos de la PWA y `og.png`. De paso, la biblioteca pública gana la vista de tabla, el Feed muestra una actividad por fila y los topes del plan free se avisan con el toast dorado de Premium. Es solo frontend y landing.

## Highlights

- Tipografía Chakra Petch (títulos) + Manrope (texto) en app y landing, con licencias OFL 1.1 junto a las fuentes.
- Un archivo de tokens por tema en `styles/themes/`, sin copias de `styles.css` ni `ui.css` por tema.
- Selector Diary / Hardcore en la biblioteca pública, reutilizando `BacklogTable` en modo `readonly`.
- `BacklogStatusPills`, `BacklogTable`, `QueueListSection`, `ViewModeToggle`, `UiNoMatches` y `UiPlainEmptyState` reemplazan markup copiado entre vistas.

## Added

- `UiNoMatches` y `UiPlainEmptyState` (`shared/ui/empty-state/`): estado "sin resultados" con botón para limpiar y estado vacío plano.
- `BacklogStatusPills` (`shared/components/backlog-status-pills`): filtro por estado con `layout` `wrap` o `scroll`, input `selected` y output `statusSelect`. Opciones únicas `BACKLOG_STATUS_FILTERS` y `BACKLOG_STATUS_PICKER_OPTIONS` en `shared/utils/backlog-status.ts`.
- `BacklogTable` (`features/backlog/components/backlog-table`): tabla Hardcore con columnas como datos, `statusMenuOpenId` como `model()` y eventos hacia el padre. Con `readonly` oculta favorito y Up Next, fija el estado y deja las estrellas de solo lectura.
- `QueueListSection` (`features/queue/queue-list-section`): sección de lista compartida por `/queue` y `/user/:username/queue`.
- `ViewModeToggle` (`shared/components/view-mode-toggle`): selector de vista de My Games, My Shelf y la biblioteca pública.
- Fuentes autoalojadas en `apps/web/public/fonts/` y `apps/landing/public/fonts/`: Chakra Petch 500/600/700 y Manrope variable, con `chakra-petch-OFL.txt` y `manrope-OFL.txt`.
- Tokens `brand-solid` y `brand-solid-hover` para controles rellenos con texto blanco (4.5:1 en Refined Dark).

## Changed

- Temas: `refined-dark.css`, `midnight-cyan.css` y `twilight-arcade.css` en `styles/themes/` definen solo tokens. Se borraron las carpetas por tema con copias de `styles.css` y `ui.css`.
- Botones y controles rellenos usan `brand-solid` en 15 componentes (auth, favoritos, juego, Browse, perfil, Up Next, settings, What's new, shell, `GameCoverCard`, `ReviewCard`).
- `user-backlog` muestra Diary o Hardcore con orden por columnas (misma `BacklogQuerySchema` que la ruta propia). El modo se guarda en `completr.publicBacklog.viewMode`.
- Feed: una fila por actividad; se quitó la agrupación de actividades consecutivas. Una acción deshecha conserva su registro.
- `errorInterceptor` avisa los 402 de tope free con `toast.premium("Free plan limit", mensaje, 6000)`; `toast.premium` acepta duración.
- Estados vacíos: 8 vistas usan `UiNoMatches` y Up Next (×2), biblioteca pública y Feed usan `UiPlainEmptyState`.
- `backlog-list.html` baja de unas 2120 a 1670 líneas al extraer la tabla.
- Favicon de la app en trazo, íconos de la PWA y `og.png` de la landing regenerados.
- Landing: Chakra Petch + Manrope en lugar de Sora + Inter.

## Removed

- Space Grotesk, Sora e Inter.
- `styles/themes/README.md` y las copias de estilos por tema.

## Files of interest

- `apps/web/src/styles/themes/refined-dark.css`
- `apps/web/public/fonts/chakra-petch.css`
- `apps/web/src/app/features/backlog/components/backlog-table/backlog-table.ts`
- `apps/web/src/app/shared/components/backlog-status-pills/`
- `apps/web/src/app/shared/components/view-mode-toggle/view-mode-toggle.ts`
- `apps/web/src/app/features/public-profile/user-backlog/user-backlog.ts`
- `apps/web/src/app/features/feed/feed-page.ts`
- `docs/context/frontend.md`
- `docs/context/landing.md`

## Commits

- `6fb10275` — feat(web): add no-matches and plain empty state components
- `a627b709` — feat(web): add backlog status filters and pills
- `42615b8d` — refactor(queue): extract queue list section
- `0ca265a9` — refactor(backlog): extract backlog table component
- `c79bb762` — refactor(web): use shared empty states in list views
- `6c3182cf` — refactor(public-profile): reuse backlog pills and queue list section
- `69cbb54a` — feat(web): refresh themes and typography
- `bb07f20d` — style(web): use solid brand color for filled controls
- `7bdcdcb6` — feat(web): show plan limit errors as premium toast
- `db6972df` — refactor(web): extract view mode toggle component
- `08997948` — feat(backlog): show hardcore table in public library
- `2fd713f5` — refactor(feed): show one activity per row
- `b1dcb928` — docs(web): document themes, typography and shared components
- `7a9a16d8` — feat(landing): switch to Chakra Petch and Manrope fonts
- `b755d222` — feat(web): refresh favicon and app icons
- `22f98161` — feat(landing): refresh favicon and og image
- `bf883c08` — docs(landing): document Chakra Petch and Manrope fonts
