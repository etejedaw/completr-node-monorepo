# Platinos en el perfil

**Released:** 2026-10-26

## Summary

Los platinos pasan a tener lectura propia: `GET /users/:username/platinums` lista los de un usuario, del más reciente al más antiguo, y el perfil público muestra los últimos ocho en una sección "Platinums" que solo aparece si hay alguno. Hay una página `/user/:username/platinums` con búsqueda y filtro por plataforma, igual que favoritos o la estantería. Los platinos ganan su propia sección de privacidad, `platinumVisibility`, que manda en todos los lugares donde aparece un platino: la lista, la sección del perfil, el campo `platinum` del backlog público, el filtro `platinumed_only` y el evento `game_platinumed` del feed y de la actividad del perfil. Hasta ahora el platino seguía la visibilidad del backlog; para no exponer platinos de nadie, la migración copia en cada cuenta existente su `backlogVisibility`.

## Highlights

- `GET /users/:username/platinums`, paginado y con `search` por título.
- Sección "Platinums" en el perfil público y página `/user/:username/platinums`.
- Opción "Platinums" en Settings › Privacy, en el grupo Library.
- La visibilidad de los platinos se aplica también al backlog público, al feed y a la actividad del perfil.

## Added

- Migración `20261026033632-add-platinumvisibility-to-users.js`: columna `"platinumVisibility" "enum_Users_visibility" NOT NULL DEFAULT 'public'`, inicializada con el valor de `"backlogVisibility"` de cada cuenta.
- Sección `platinum` en `VISIBILITY_SECTIONS` y campo `platinumVisibility` en el modelo `User`, `UpdateUserSchema`, `USER_CARD_ATTRS` y los serializers de usuario. El perfil devuelve `access.platinum`.
- `GET /users/:username/platinums` en `game-platinum.controller`: exige `canView` de `profile` y de `platinum` (403 `USER_PRIVATE`), acepta `limit`, `offset` y `search`, y ordena por `platinumedAt` descendente con los platinos sin fecha al final, luego `createdAt` descendente. Cada entrada lleva el juego y la plataforma; para otros viewers omite `notes` y oculta el `backlogId` de una run privada.
- `findPlatinumsByUserIdPaginated` en `game-platinum.service` y `platinumEntrySerializer` en `game-platinum.serializer`.
- `sectionVisibleToViewerSql` en `visibility.helper`: la condición de visibilidad de una sección como SQL, para filtrar en la consulta.
- Web: modelo `PlatinumEntry`, `getUserPlatinums` en `PublicLibraryService`, componente compartido `PlatinumCoverCard` (portada con anillo y medallón del trofeo en color `platinum`, plataforma y fecha), página `UserPlatinums` sobre `ProfileCollectionPage` y sección `ProfilePlatinums` en el perfil público.

## Changed

- El backlog público solo carga el platino si el viewer puede ver la sección `platinum`. Sin acceso, cada run lleva `platinum: null` y `platinumed_only` se ignora, para no revelar qué juegos están platinados.
- `GET /feed` filtra `game_platinumed` por la visibilidad de los platinos del autor, en la consulta, así que `total` y la paginación solo cuentan lo visible.
- La actividad reciente de `GET /users/:username` omite `game_platinumed` para quien no puede ver los platinos.
- `privacy-options` permite que una sección declare su título e icono en vez de tomarlos del menú, porque "Platinums" no tiene entrada propia en la navegación.

## Migration

- Correr `npm run migrate:dev` y `npm run migrate:prod` para agregar `platinumVisibility`. Sin la columna, cargar un usuario falla.

## Files of interest

- `apps/api/migrations/20261026033632-add-platinumvisibility-to-users.js`
- `apps/api/src/game-platinum/game-platinum.controller.ts`
- `apps/api/src/users/helpers/visibility.helper.ts`
- `apps/api/src/activity/activity.service.ts`
- `apps/web/src/app/shared/components/platinum-cover-card/platinum-cover-card.ts`
- `apps/web/src/app/features/public-profile/components/profile-platinums.ts`
- `apps/web/src/app/features/settings/settings-privacy/privacy-options.ts`
- `docs/api/game-platinum/get-user-platinums.yml`

## Commits

- `6dd6c170` — feat(api): add platinum visibility column to users
- `12c8720d` — feat(users): add platinum visibility section
- `8631f3bf` — feat(game-platinum): list the platinums of a user
- `6001f40e` — feat(api): hide platinums in backlog, feed and profile activity by platinum visibility
- `2bfbe908` — test(api): cover the platinums list and platinum visibility
- `fb26f0bb` — docs(api): document the platinums endpoint and platinum visibility
- `c3e5b3aa` — feat(web): add platinum visibility and platinums models to the client
- `e80f255a` — feat(web): add platinums to the privacy settings
- `62277af8` — feat(web): add the user platinums page
- `24c99d9e` — feat(web): show the latest platinums in the public profile
- `8a702f2d` — test(web): cover platinums page, profile section and privacy option
