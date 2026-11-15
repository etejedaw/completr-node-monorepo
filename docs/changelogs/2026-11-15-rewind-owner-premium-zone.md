# Zona premium del Rewind

**Released:** 2026-11-15

## Summary

Todo lo que gasta o configura la IA del Rewind queda agrupado en una zona premium con marco dorado y el listón, tanto en el panel del dueño como en el diálogo de generación. Así se reconoce de un vistazo qué es premium sin pintar de dorado cada chip y botón.

## Changed

- `rewind-owner-panel`: la zona premium reúne las generaciones que quedan, el día extra, "Includes private runs", "Uses your notes", Add AI recap y Regenerate, porque regenerar gasta una generación con IA. El listón (`UiPremiumBadge` interactivo) muestra la explicación de una generación con IA, sin la palabra "Premium" al lado. Sin acceso no hay zona, y los chips de runs privadas y notas quedan en la fila de estado. El estado pendiente y el error del AI recap quedan fuera de la zona, para que sigan visibles si la recarga la cierra.
- `rewind-generate-dialog`: la sección AI recap y sus interruptores van dentro de una zona premium con el listón y el título en dorado.
- El spec del panel vuelve a las comprobaciones de develop sobre el listón ("Premium" y "Gift" como nombre del botón) y suma la zona, el doble clic sobre el listón y la ausencia de dorado sin acceso.

## Commits

- `b435cb21` — feat(rewind): group the owner's premium controls in a gold framed zone with the perk crown
- `7dca2ce3` — test(rewind): restore the premium crown checks and cover the owner panel premium zone
- `6525550e` — feat(rewind): move regenerate into the owner's premium zone
- `1ac30ca0` — test(rewind): expect regenerate inside the premium zone
- `0321a78a` — feat(rewind): move the ai recap options into the premium zones of the owner panel and the generate dialog
- `58a676d5` — test(rewind): cover the ai recap options inside the premium zones
- `4c010acd` — fix(rewind): show only the premium crown in the owner's premium zone
