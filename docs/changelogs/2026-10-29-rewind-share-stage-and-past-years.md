# Compartir del Rewind en un escenario y Rewinds anteriores en el perfil

**Released:** 2026-10-29

## Summary

En la página del Rewind, la columna "Compartir" mostraba una vista previa chica, con los botones arriba a la derecha y mucho espacio vacío al lado de Resultados. Ahora la story va sobre un escenario propio, una tarjeta con un halo del degradado del año, y los botones quedan debajo: "Compartir imagen" a todo el ancho y, en una fila, "Descargar imagen" y "Copiar enlace". La tarjeta termina siempre a la misma altura que Resultados y la story se ajusta a ese alto sin perder el 9:16. En el perfil, durante la ventana del Rewind (1 de diciembre al 31 de enero) los años anteriores ya no desaparecen: siguen en su sección "Year in review · Rewind", debajo del año destacado.

## Changed

- `RewindShareActions` con `previewSize="fit-row"`:
    - escenario con halo decorativo (`aria-hidden`);
    - acciones en una grilla de dos columnas;
    - "Copiar enlace" como botón secundario.

    El diálogo de compartir (`full`) mantiene su diseño.

- La sección de Compartir no aporta alto a la grilla: su contenido se posiciona dentro de la celda (ancho de 23 rem, alto mínimo de 34 rem), así que la fila la fija Resultados.
- `public-profile.pastRewinds` deja fuera solo el año destacado, en vez de vaciarse durante la ventana. El hero ya no muestra el enlace "Past rewinds".

## Commits

- `7945143d` — feat(rewind): show the share preview on a stage that matches the results height
- `8c2a3e7f` — feat(public-profile): keep past rewinds in their own section while a year is in the spotlight
