# Public profile restructure

**Released:** 2026-06-18

## Summary

Reorganizacion del perfil publico: Highlights pasa a ser el tab por defecto en lugar de Backlog, la seccion Recent Activity se mueve del sidebar lateral al pie del perfil con layout timeline + sidebar de followers, y el tile "Reviews" del grid de stats deja de mostrar el tamano del preview para mostrar el total real. Resuelve los items FB-025, FB-027 y FB-028.

## Highlights

- Tab inicial del perfil = Highlights, con cadena de fallback `highlights → shelf → lists → favorites → queue → wishlist → reviews` segun privacidad.
- Recent Activity reubicada al pie como `<section>` full-width con timeline `border-l` + dots con icono por tipo, mas sidebar derecha con avatares de los primeros 8 followers.
- Tile "Reviews" del grid de stats usa el total devuelto por el endpoint, no la longitud del preview cargado.

## Changed

- Tab default del perfil publico es `highlights`. El handler de resize ya no hace swap entre `activity` y otros tabs (el tab "Activity" del `ui-tabs` fue eliminado).
- Sidebar lateral `<aside lg:block lg:sticky>` removido junto al wrapper `lg:grid lg:grid-cols-[320px_1fr]` que lo contenia.
- Recent Activity ahora vive al pie del perfil bajo `<section class="lg:grid lg:grid-cols-[1fr_320px]">` con timeline a la izquierda y card "Followers" sticky a la derecha (avatares + "View all N" que abre el modal existente + "Member since").
- Computed `stats.reviews` ahora usa `userReviewsTotal()` (consistente con `stats.lists = listsTotal`).
- En Highlights, cuando `month.completedCount === 0` se omite el bloque del mes — el header con "0 completed" + flechas de navegacion ya es suficiente.

## Fixed

- FB-025: tile "Reviews" del grid de stats mostraba siempre 5 (size del preview) aunque el usuario tuviera mas reviews.

## Files of interest

### Frontend (completr-node-frontend)

- `src/app/features/public-profile/public-profile.ts` — helper `pickDefaultTab(profile)`, signals `recentFollowers`, lazy load de followers en `loadProfile`.
- `src/app/features/public-profile/public-profile.html` — eliminacion del sidebar lateral y tab "Activity", nueva `<section>` al pie con grid 1fr + 320px.

## Commits

### Frontend (completr-node-frontend)

- `a61fa460` — feat(profile): default to highlights tab with privacy fallback
- `0ca93939` — fix(profile): reviews tile counter shows total instead of preview size
- `c29e6c33` — feat(profile): move recent activity to footer timeline with followers sidebar
