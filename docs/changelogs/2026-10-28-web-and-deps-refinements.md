# Ajustes de web y dependencias

**Released:** 2026-10-28

## Summary

Tres cambios chicos e independientes. El formulario de usuarios del admin rastreaba sus mensajes de error por el objeto del error, así que cada objeto nuevo hacía que Angular recreara la lista de mensajes; ahora los rastrea por posición. Los specs de interacción que responden lo pendiente con `httpTesting.match` ahora saltan las peticiones canceladas, porque responder una cancelada lanza un error. Y el lockfile aplica las correcciones de `npm audit` y deja todos los paquetes de Angular en la misma versión.

## Fixed

- `admin-users.html`: los `@for` de errores de los formularios de crear y editar usan `track $index` en lugar de `track error`.
- Specs de interacción de My Games, el modal de runs (también el de platinos), el editor de juegos, la ficha del juego, Lists, Up Next y Want to Get: `answerPending` filtra las peticiones con `req.cancelled` antes de responderlas.

## Changed

- `package-lock.json`: correcciones de `npm audit` y paquetes de Angular alineados en 22.2.4 (`@angular/build`, `@angular/cli` y el resto quedaban en 22.1.x).

## Files of interest

- `apps/web/src/app/features/admin/admin-users/admin-users.html`
- `apps/web/src/app/features/lists/list-overview/list-overview.interaction.spec.ts`
- `package-lock.json`

## Commits

- `25770fc5` — fix(web): track admin user form errors by index to avoid list re-creation
- `df3f501f` — test(web): skip cancelled requests when answering pending http calls in specs
- `8e4ed403` — chore(deps): apply npm audit fixes and align angular package versions
