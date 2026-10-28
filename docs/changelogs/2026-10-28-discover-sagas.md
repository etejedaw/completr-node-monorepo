# Descubrir sagas

**Released:** 2026-10-28

## Summary

Hasta ahora una saga solo se alcanzaba desde Admin o desde las sagas que el usuario ya seguía en su perfil. La nueva página `/franchises` en Discover lista todas las sagas del catálogo con búsqueda, paginación y un botón para seguirlas desde la tarjeta. Para alimentarla sin llamadas extra, `GET /franchises` pasa a auth opcional y suma a cada saga su cantidad de juegos activos, una vista previa de portadas y si el visitante la sigue. Por decisión de producto las sagas no muestran progreso personal en ninguna parte: la interfaz ya lo había quitado y ahora la API deja de enviarlo, y `gameCount` reemplaza a `progress`, `completed` y `franchiseProgress`. Crear, editar y borrar sagas sigue siendo de moderadores y admin; los usuarios solo las siguen.

## Highlights

- Página Sagas en Discover: grilla de tarjetas con portadas en orden de lanzamiento, cantidad de juegos y Track / Tracking, búsqueda y paginación.
- `GET /franchises` responde a visitantes con `gameCount`, `previewGames` e `isTracked`.
- Seguir una saga desde el listado o el detalle manda una sola petición aunque se haga clic varias veces, y un fallo se explica con un toast.
- Ninguna respuesta de sagas incluye progreso personal.

## Added

- `GET /franchises`: `gameCount` (juegos activos), `isTracked` (`false` sin sesión) y `previewGames` (hasta 4 juegos activos por fecha de lanzamiento, desempate por id, con `id`, `code`, `title` y `backgroundUrl`). Lo arma `franchiseSummarySerializer` (`franchises.serializer.ts`).
- `franchisesService.findTrackedFranchiseIdsAmong` para marcar en una sola consulta las sagas de la página que sigue el visitante, y `findTrackedFranchises` para el perfil.
- `FranchiseOverview` (`/franchises`): `LibraryHero`, `LibraryToolbar` con búsqueda (debounce de 300 ms, recortada), grilla de `FranchiseCard`, `UiPagination` de 24, esqueleto, vacío sin opción de crear, "sin resultados" con Clear search y error con Try again. Mientras carga una búsqueda nueva mantiene las tarjetas anteriores con `aria-busy`; `rxResource` cancela la petición anterior, así que una respuesta lenta no pisa a la nueva.
- `FranchiseCard`: tarjeta 16:10 con enlace que cubre toda la tarjeta, botón Track con `aria-pressed`, `aria-busy` y nombre de la saga para lectores de pantalla, 32 px en escritorio y 44 px táctiles.
- `injectFranchiseTracking()` (`features/franchises/franchise-tracking.ts`): estado de seguimiento por saga, una petición a la vez por saga, toast de error y `onMissing` para recargar cuando la saga ya no existe (404).
- `FranchisesService.setTracked(code, tracked)`.
- Ítem "Sagas" en la sección Discover del menú (también en la hoja More de mobile), token `nav-sagas` en los tres temas, entrada en Help y en el tour de bienvenida.

## Changed

- `GET /franchises` usa `authOptionalMiddleware`: sin token o con un token inválido responde como a un visitante. Ya no devuelve `createdAt` ni `updatedAt`.
- `GET /franchises/:code` devuelve `gameCount` en lugar de `progress`.
- `GET /users/:username/franchises` devuelve `{ franchise, gameCount }` por saga, ordenadas por nombre, en lugar de `completed` y `total` ordenadas por completados.
- `FranchiseDetail` usa `injectFranchiseTracking`: antes un fallo al seguir la saga era silencioso. El vacío de "Saga not found" lleva a Browse sagas.
- Modelos web: `FranchiseProgress` pasa a `TrackedFranchise` y `FranchiseDetail.progress` a `gameCount`; `profile-sagas` muestra `gameCount`.

## Removed

- `franchiseProgress` de `GET /games/:code` y el cálculo de juegos completados por saga en el detalle del juego, el detalle de la saga y el perfil.

## Files of interest

- `apps/api/src/franchises/franchises.controller.ts`
- `apps/api/src/franchises/franchises.serializer.ts`
- `apps/api/src/franchises/franchises.service.ts`
- `apps/web/src/app/features/franchises/franchise-overview/franchise-overview.ts`
- `apps/web/src/app/features/franchises/components/franchise-card/franchise-card.ts`
- `apps/web/src/app/features/franchises/franchise-tracking.ts`
- `docs/api/franchises/get-all.yml`

## Commits

- `4fe33414` — feat(api): serve franchise list to guests with game count, previews and tracked flag
- `cc6371d7` — refactor(api): drop saga progress from profile franchises
- `baf25c0a` — refactor(api): drop franchise progress from game detail
- `42f24585` — docs(api): update franchise endpoints for game count and optional auth
- `ad5c9c12` — refactor(web): replace saga progress with game count in franchise models
- `d178d909` — feat(web): share saga tracking with error feedback and duplicate click guard
- `e09fe125` — feat(web): add sagas discover page
- `9216d987` — docs: document saga rules and discover page components
