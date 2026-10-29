# Mensajes de variante en el editor de juegos

**Released:** 2026-10-28

## Summary

Crear un juego cuyo id externo ya usa otro respondía `GAME_VARIANT_REQUIRED` y el editor del admin mostraba un genérico "Failed to create game.". Ahora explica qué hacer según el caso, y el diálogo de Split aclara que el juego original no se conserva como bundle, sino que se renombra a la primera variante.

## Fixed

- `admin-game-editor` traduce `GAME_VARIANT_REQUIRED` al crear:
    - sin etiqueta de variante, pide ponerle una a este juego;
    - con etiqueta, pide agregársela primero al juego que ya existe.
- El subtítulo del diálogo de Split explica que el juego actual se renombra a la primera variante y cómo recrear el bundle como compilación.

## Commits

- `d77000ad` — fix(games): explain variant required error when creating a game
- `11d91d10` — fix(games): clarify that split renames the original game
- `24994265` — test(games): cover variant required messages on game creation
