# Íconos de completado distintos del trofeo de platino

**Released:** 2026-10-25

## Summary

Con el platino por juego, el trofeo (`emoji_events`) pasó a significar "platinado", pero seguía marcando también los juegos completados del "Month in review" del perfil y las listas completadas. Ahora el trofeo queda solo para el platino: el "Month in review" usa `check_circle`, el mismo ícono del estado `completed` del backlog y de la activity `backlog_completed`, y las listas completadas usan `military_tech` (medalla con listón). `workspace_premium` se descartó porque ya identifica a Premium.

## Changed

- `ProfileMonthReview`: la tarjeta "N games completed" pasa de `emoji_events` a `check_circle`.
- `ListCard` (insignia "Completed" de una lista al 100%), `ProgressMeter` ("Completed" del medidor) y `GameFeaturedLists` ("You completed it" en la ficha del juego) pasan de `emoji_events` a `military_tech`. El color `text-success` se mantiene.

## Commits

- `6568d074` — fix(web): use the completed check icon in the profile month review
- `e739a2f5` — fix(web): mark completed lists with a medal instead of the platinum trophy
