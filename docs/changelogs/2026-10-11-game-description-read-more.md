# Descripciones largas colapsadas en la ficha del juego

**Released:** 2026-10-11

## Summary

La descripción del juego se mostraba completa y sin límite de alto. Con las descripciones largas que trae RAWG, la ficha se estiraba y las secciones de abajo (tags, scores, actividad) quedaban muy lejos. Ahora la descripción se corta a 6 líneas y un botón "Read more" la expande. El botón solo aparece cuando el texto realmente no cabe.

## Added

- Componente compartido `ExpandableText` (`app-expandable-text`): corta el texto a 6 líneas con `line-clamp` y muestra "Read more" / "Read less" con `aria-expanded` y `aria-controls`. Mide si el texto desborda después de renderizar y vuelve a medir cuando cambia el ancho (con un `ResizeObserver`). Al cambiar el texto, por ejemplo al navegar a otro juego, vuelve a quedar colapsado.

## Changed

- La sección Description de `game-detail` usa `app-expandable-text` en lugar del párrafo con el texto completo.

## Files of interest

- `apps/web/src/app/shared/components/expandable-text/expandable-text.ts` — lógica de medición y estado.
- `apps/web/src/app/features/games/game-detail/game-detail.html` — uso en la ficha.

## Commits

- `95868267` — feat(game-detail): collapse long descriptions with read more
