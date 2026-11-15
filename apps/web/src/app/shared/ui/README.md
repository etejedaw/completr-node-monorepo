# shared/ui: design system v0.5

Piezas visuales base de la web. Se importan siempre desde `shared/ui` (el `index.ts`), nunca con rutas internas. Toda pantalla usa estas piezas en vez de armar HTML o CSS propio; si falta una variante, se agrega al componente y no a la pantalla.

Los estilos que no caben en clases de Tailwind (botones, pestañas, interruptores, inputs) viven en `src/styles/ui.css`. Los tokens de color, texto y sombra viven en `@theme` de `src/styles.css`.

## Catálogo

| Pieza                                                  | Selector                                                      | Para qué                                                                                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `UiButton`                                             | `button[uiButton]`, `a[uiButton]`                             | Botón o enlace con aspecto de botón. Variantes `primary`, `secondary`, `ghost`, `glass`, `danger`, `premium`, `link`, `link-danger`; tamaños `sm`, `md`, `lg`; `block` para ancho completo |
| `UiIconButton`                                         | `button[uiIconButton]`, `a[uiIconButton]`                     | Botón solo con ícono; exige `aria-label`                                                                                                                                                   |
| `UiFiltersButton`                                      | `button[uiFiltersButton]`                                     | Botón de filtros con contador y etiqueta que se oculta en mobile                                                                                                                           |
| `UiInput`, `UiTextarea`                                | `input[uiInput]`, `textarea[uiTextarea]`                      | Campos de texto; 44px de alto en táctil                                                                                                                                                    |
| `UiFormField`, `UiLabel`, `UiDescription`              | `[uiFormField]`, `label[uiLabel]`, `[uiDescription]`          | Campo con etiqueta y descripción enlazadas por ng-primitives                                                                                                                               |
| `UiFieldLabel`, `UiFieldOptional`                      | `[uiFieldLabel]`, `ui-field-optional`                         | Etiqueta suelta (por ejemplo la del date picker) y marca "optional"                                                                                                                        |
| `UiFieldError`                                         | `ui-field-error`                                              | Único error bajo un campo; se enlaza con `aria-describedby`                                                                                                                                |
| `UiCheckbox`, `UiSwitch`                               | `ui-checkbox`, `ui-switch`                                    | Casilla e interruptor                                                                                                                                                                      |
| `UiDatePicker`, `UiDateRangePicker`, `UiCalendarPanel` | `ui-date-picker`, `ui-date-range-picker`, `ui-calendar-panel` | Fechas y rangos; nunca `<input type="date">`                                                                                                                                               |
| `UiSearchBar`                                          | `ui-search-bar`                                               | Búsqueda con botón de limpiar                                                                                                                                                              |
| `UiTabs`, `UiTabList`, `UiTab`, `UiTabPanel`           | `ui-tabs`, `[uiTabList]`, `button[uiTab]`, `[uiTabPanel]`     | Pestañas                                                                                                                                                                                   |
| `UiDialog`                                             | `ui-dialog`                                                   | Único diálogo de la app; se abre con `DialogService`. Tonos y tamaños por input                                                                                                            |
| `UiBottomSheet`                                        | `ui-bottom-sheet`                                             | Hoja inferior para mobile y menús largos                                                                                                                                                   |
| `UiDrawer`                                             | `ui-drawer`                                                   | Panel lateral                                                                                                                                                                              |
| `UiFocusTrap`                                          | `[uiFocusTrap]`                                               | Atrapa el foco; lo usan diálogo, hoja y drawer                                                                                                                                             |
| `UiAlert`                                              | `ui-alert`                                                    | Aviso en línea con tono (`role` configurable)                                                                                                                                              |
| `UiBadge`, `UiCountBadge`, `UiPremiumBadge`            | `ui-badge`, `ui-count-badge`, `ui-premium-badge`              | Insignias; la premium es la única con dorado                                                                                                                                               |
| `UiAvatar`                                             | `ui-avatar`                                                   | Avatar con iniciales de respaldo                                                                                                                                                           |
| `UiProgress`, `UiSkeleton`                             | `ui-progress`, `ui-skeleton`                                  | Progreso y esqueleto con la forma del contenido                                                                                                                                            |
| `UiEmptyState`, `UiPlainEmptyState`, `UiNoMatches`     | `ui-empty-state`, `ui-plain-empty-state`, `ui-no-matches`     | Vacíos: el grande con halo, el sobrio de página (con nivel de encabezado) y el de "sin resultados" con acción de limpiar                                                                   |
| `UiPagination`                                         | `ui-pagination`                                               | Paginador                                                                                                                                                                                  |
| `UiTable`                                              | `table[uiTable]`                                              | Tabla con cabecera, filas y selección estilizadas                                                                                                                                          |
| `UiEyebrow`, `UiSeparator`                             | `[uiEyebrow]`, `[uiSeparator]`                                | Sobretítulo con tono y separador                                                                                                                                                           |
| `UiTone`                                               | tipo y mapas de clases                                        | Tonos compartidos (`brand`, `danger`, `warning`, `success`, `premium`)                                                                                                                     |
| `injectBodyPortal`                                     | función `inject*`                                             | Lleva un overlay a `document.body`                                                                                                                                                         |

## Piezas compuestas fuera de `ui/`

Viven en `shared/components/` porque combinan varias piezas del design system con lógica de dominio o de interacción, y moverlas rompería imports en todas las features. Se usan igual que las de `ui/`:

| Pieza                                             | Para qué                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `ActionMenu`                                      | Menú de acciones `⋯`; en mobile abre una hoja con las acciones con texto          |
| `OptionPicker`, `MultiOptionPicker`               | Selector de una o varias opciones, en popover o en hoja                           |
| `SegmentedControl`, `ChipGroup`, `ViewModeToggle` | Controles de segmento y chips de filtro                                           |
| `ToastContainer`                                  | Único contenedor de toasts, montado en el shell; se alimenta desde `ToastService` |
| `StarRating`, `ProgressMeter`, `RatioSummary`     | Valoración, medidor y resumen del ratio                                           |
| `LibraryHero`, `LibraryToolbar`, `LibraryPage`    | Estructura de las páginas de biblioteca                                           |

## Reglas de uso

- Overlays: `ui-backdrop` (utilidad en `styles.css`) para el fondo, `shadow-dialog` y `shadow-drawer` para las sombras. No se copian animaciones ni sombras.
- Texto en tokens: `text-micro`, `text-tiny`, `text-caption`, `text-compact` y `text-lead` en vez de `text-[0.6875rem]` y similares. Sobre imágenes, `text-on-image`.
- El dorado (`premium`) solo marca el premium completo; nunca en chips, íconos de acción ni textos fuera del marco premium.
- Táctil: el design system ya da 44px bajo 768px o con puntero táctil. Los elementos propios usan `tap:` o `.tap-area`, y nada depende solo de `:hover`.
- Todo input, output y señal de un componente es `readonly`; lo que solo usa la plantilla es `protected`.
