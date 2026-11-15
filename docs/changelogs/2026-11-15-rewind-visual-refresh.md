# Rewind: refresco visual de highlights y panel

**Released:** 2026-11-15

## Summary

Ajustes visuales del Rewind en la web: el reto recupera un tono propio y el dorado queda reservado al marco del resumen con IA, las tarjetas de highlights pasan a una sola superficie con acentos de color e imagen del juego (paleta Acento), y "Regenerate" pasa a ser la acción primaria del panel del dueño.

## Changed

- `rewind-ai-recap`: el marco del resumen con IA conserva el dorado y el reto usa su propio tono (`rewind-tone.ts`).
- `rewind-highlights`: cada tarjeta usa una sola superficie con acento según su tono y muestra la imagen del juego cuando la tiene.
- `rewind-owner-panel`: el botón "Regenerate" pasa a ser la acción primaria.
- Tests de las tarjetas de acento y de su imagen de juego.

## Commits

- `b58fc198` — fix(rewind): keep gold for the ai recap frame and give the challenge its own tone
- `c7119676` — feat(rewind): give highlight cards one surface with tone accents and game art
- `cd6836e7` — test(rewind): cover accent highlight cards and their game art
- `28d8cd45` — style(rewind): make regenerate the primary action of the owner panel
