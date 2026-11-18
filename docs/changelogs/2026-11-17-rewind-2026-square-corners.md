# Esquinas cuadradas en todo el Rewind 2026

**Released:** 2026-11-17

## Summary

"Lo más destacado" del diseño `2026` ya usaba una grilla de esquinas rectas; el resto de la página seguía con tarjetas redondeadas. Ahora toda la página del 2026 tiene esquinas cuadradas, sin cambiar su estructura. Las secciones propias del diseño cambian sus clases. Las piezas compartidas que se dibujan dentro (panel del dueño, "Más Rewinds", botones y selectores del sistema de diseño) se cuadran con una sola regla en el host de `rewind-design-2026`, así que el diseño 2025 conserva sus esquinas redondeadas.

## Changed

- `rewind-design-2026` (hero, fila y banner para compartir, `rewind-2026-cover-fan`, `rewind-2026-game-of-the-year`, `rewind-2026-closed-games`) y los componentes que solo usa el 2026 (`rewind-ai-recap`, `rewind-year-mix`, `rewind-premium-stats`, `rewind-share-actions`): `rounded-*` pasa a `rounded-none` y las barras de los gráficos pierden su redondeado.
- `rewind-design-2026.ts`: el host suma `[&_*]:rounded-none!`, con `!` porque `ui.css` va fuera de las capas de Tailwind.
- `rewind-2026-closed-games.spec.ts`: las filas del mes se esperan con `rounded-none`.

## Commits

- `a88a949e` — feat(rewind): square the corners of the 2026 sections like its highlights grid
- `5fbdac12` — feat(rewind): square every corner inside the 2026 design, shared pieces included
