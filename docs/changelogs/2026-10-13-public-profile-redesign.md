# Rediseño del perfil público

**Released:** 2026-10-13

## Summary

El perfil público (`features/public-profile`) se rehace con componentes por sección (hero, estadísticas, actividad, en común, reseñas del mes, colecciones, listas, sagas, jugando ahora y Up Next) y una página de colección compartida que sirve a favoritos, game shelf, wishlist, Up Next y en común. La API de listas públicas agrega ítems de vista previa. La página de completados se elimina a favor del backlog filtrado por completados, y los usuarios pueden borrar su propia actividad desde el perfil.

## Highlights

- Secciones del perfil como componentes independientes en `public-profile/components/`.
- `profile-collection-page` y el servicio `public-collection` unifican las páginas de colección, con filtro por plataforma y grilla de portadas.
- `profile-access-state` unifica el estado de acceso restringido.
- Las listas públicas incluyen ítems de vista previa.

## Added

- Componentes `profile-hero`, `profile-stats`, `profile-activity`, `profile-in-common`, `profile-month-review`, `profile-collections`, `profile-lists`, `profile-sagas`, `profile-playing-now`, `profile-up-next`, `profile-reviews` y `profile-section-header`.
- Componentes `profile-collection-page` y `profile-access-state`, y servicio `public-collection`.
- Componente compartido `segmented-control`, entradas de enlace en `poster-shelf` y `list-card`, y ranura de acciones en `poster-shelf`.
- Componente compartido `activity-delete-button`, usado por el feed y por el perfil para que cada usuario borre su actividad.
- Plataforma como filtro y grilla de portadas en las colecciones públicas.
- Ítems de vista previa en las listas públicas (`lists.service`) y documentación del endpoint en `docs/api/users/get-user-lists.yml`.

## Changed

- `public-profile` renderiza sus secciones a través de componentes.
- Favoritos, game shelf, wishlist, Up Next y en común se construyen sobre `profile-collection-page`.
- `user-backlog` reutiliza `backlog-entry-card` y `profile-access-state`; Up Next público usa `library-hero`.
- Las secciones de resumen del perfil se rediseñan.
- La insignia de compilación amplía su área táctil.
- El desglose de la biblioteca ya no muestra la tasa de finalización.
- Los juegos de las colecciones se mapean mediante un accessor.

## Removed

- La página `user-completions` y su servicio de reseñas asociado; los completados se ven en el backlog filtrado.

## Files of interest

- `apps/web/src/app/features/public-profile/public-profile.ts` — composición del perfil.
- `apps/web/src/app/features/public-profile/components/profile-collection-page.ts` — página de colección compartida.
- `apps/web/src/app/features/public-profile/services/public-collection.ts` — carga de colecciones públicas.
- `apps/api/src/lists/lists.service.ts` — ítems de vista previa en listas públicas.

## Commits

- `98a5303d` — feat(profile): redesign public profile with hero and stats components
- `115d6fdd` — refactor(profile): reuse shared entry card in user backlog
- `6a4b4b8e` — style(profile): center stat tile content vertically
- `00df2440` — feat(profile): add access state component
- `9f9ae92f` — feat(profile): add shared collection page and data service
- `321fd34d` — refactor(profile): build favorites, game shelf and wishlist on collection page
- `7e8ff2cb` — refactor(profile): reuse access state in user backlog
- `4b89aed1` — refactor(profile): drop completions page in favor of completed backlog
- `fb19d6c4` — style(shared): enlarge compilation badge tap area
- `d7ed768c` — feat(shared): add shelf actions slot to poster shelf
- `7597279d` — feat(profile): add profile section components
- `3967ebd4` — refactor(profile): render profile sections through components
- `8a792853` — refactor(profile): map collection games through an accessor
- `4bf63a50` — refactor(profile): build public queue on collection page
- `41cd7295` — refactor(profile): use library hero in public queue
- `eac6a471` — feat(api): include list preview items in public lists
- `696e4add` — docs(api): document user lists endpoint
- `4b3f3195` — feat(shared): add segmented control component
- `f6ee1071` — feat(shared): add link inputs to poster shelf and list card
- `f11ba58d` — feat(web): add platform filter and cover grid to public collections
- `5bd465e3` — feat(web): reuse profile collection page for in-common view
- `be5acbbb` — feat(web): redesign public profile overview sections
- `745a25e2` — refactor(web): remove finish rate from library breakdown
- `3cc373dd` — refactor(feed): extract activity delete button shared with profile
- `d54104c9` — feat(public-profile): let users remove their own activities
