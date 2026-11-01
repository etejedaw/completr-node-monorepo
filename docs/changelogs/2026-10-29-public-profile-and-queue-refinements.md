# Errores de carga en el perfil público y queries de la queue

**Released:** 2026-10-29

## Summary

Dos ajustes independientes. En la web, las colecciones del perfil público (queue, wishlist, favoritos, estantería, platinos, reviews, conexiones y juegos en común) dejan de quedar vacías o cargando para siempre cuando falla la petición: muestran un estado de error con reintento. En la API, la queue deja de consultar directamente los modelos de `backlog` y pasa por funciones de su service, como pide la regla de comunicación entre módulos.

## Fixed

- `injectPublicCollection` (`apps/web/src/app/features/public-profile/services/public-collection.ts`) se reescribe sobre `rxResource`. Espera a que el usuario autenticado esté cargado antes de pedir la página, descarta respuestas viejas al paginar y expone el estado de error con su status.
- `ProfileCollectionPage`, `UserConnections` y `UserQueue` muestran `ui-empty-state` con `role="alert"`, el mensaje "Couldn't load the …" y un botón "Try again" de 44 px táctiles.

## Changed

- `buildQueueBacklogInclude` y las consultas de backlogs para la queue viven ahora en `backlog.service.ts`; `queue.service.ts` las consume en lugar de importar `Backlog`, `Game` y `Platform`.

## Commits

- `1502767` — refactor(queue): move backlog queries behind module services
- `3ef5f8f` — fix(public-profile): handle collection loading failures
