# Diseño 2025 del Rewind completo e independiente

**Released:** 2026-11-16

## Summary

El diseño `2025` del Rewind compartía secciones con el diseño `2026`, de modo que cambiar uno arrastraba al otro. Ahora tiene sus propias copias (`rewind-2025-tally`, `rewind-2025-persona-rank`, `rewind-2025-premium-stats` y `rewind-2025-year-mix`) y la regla queda escrita en `docs/architecture.md`: cada diseño anual es completo e independiente, y para que un año se vea distinto se copia el componente a su carpeta en lugar de agregar opciones por año a uno compartido. Por eso la opción por año que se había agregado a las estadísticas premium compartidas (`a70bc123`) se revirtió (`04e23020`). Además el diseño suma una frase de resumen y un botón Share que solo comparte el enlace, y su recuento pasa a una franja de cifras a todo el ancho bajo el hero.

## Highlights

- Piezas propias del diseño `2025`: recuento, rango de persona, estadísticas premium con 3 gráficos (sin el de backlog) y "More of your year", ubicado sobre las estadísticas premium.
- Botón Share de solo enlace con `injectRewindLinkShare`.
- Recuento como franja de cifras a todo el ancho bajo el hero.

## Added

- `rewind-2025-tally`, `rewind-2025-persona-rank`, `rewind-2025-premium-stats` y `rewind-2025-year-mix` en `components/rewind-design-2025/`, con su copy bilingüe y sus specs.
- `injectRewindLinkShare` (`features/rewind/inject-rewind-link-share.ts`): en pantallas táctiles abre la hoja nativa de compartir; en escritorio copia el enlace aunque el navegador tenga `navigator.share`. Una sola acción en curso a la vez, un fallo de la hoja nativa que no sea cancelación cae a copiar, y los avisos salen por `ToastService`.
- Frase de resumen en el diseño `2025`.

## Changed

- `rewind-design-2025` usa los componentes propios en lugar de `rewind-tally`, `rewind-persona-rank` y `rewind-premium-stats`.
- El bloque "More of your year" se movió sobre las estadísticas premium.
- El recuento se dibuja como franja de cifras a todo el ancho bajo el hero.
- `docs/rules.md` documenta cómo el diseño `2025` comparte su enlace.
- `docs/architecture.md` agrega la regla de diseños anuales independientes.

## Removed

- La opción por año de las estadísticas premium compartidas (`rewind-premium-stats`), agregada y revertida en el mismo grupo de commits.

## Files of interest

- `apps/web/src/app/features/rewind/components/rewind-design-2025/rewind-design-2025.ts`
- `apps/web/src/app/features/rewind/components/rewind-design-2025/rewind-2025-tally/rewind-2025-tally.ts`
- `apps/web/src/app/features/rewind/inject-rewind-link-share.ts`
- `docs/architecture.md`

## Commits

- `a70bc123` — feat(rewind): drop the backlog chart from the 2025 design and give the hours chart the full width
- `7d23e4a1` — feat(rewind): give the 2025 design its own tally, persona, premium stats and year mix
- `04e23020` — refactor(rewind): drop the per-year backlog option from the shared premium stats
- `2c9d6af7` — docs(architecture): make every rewind year design complete and independent
- `01cfc4aa` — feat(rewind): show more of your year above the premium stats in the 2025 design
- `d905058c` — feat(rewind): add the summary sentence and a link-only share button to the 2025 design
- `81c99575` — docs(rules): explain how the 2025 rewind shares its link
- `40f3e772` — feat(rewind): draw the 2025 tally as a full-width band of figures under the hero
