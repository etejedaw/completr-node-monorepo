# Hero del Feed y sagas sin progreso

**Released:** 2026-10-14

## Summary

El Feed era el único módulo principal sin el banner de portadas; ahora usa `LibraryHero` con las portadas de los juegos de la página cargada. Por decisión de producto, las sagas dejan de mostrar progreso en la página de la saga, en la sección Sagas del perfil y en el enlace a la saga del hero del juego. La API no cambia: `progress` y `franchiseProgress` se siguen enviando.

## Changed

- `feed-page`: `LibraryHero` fuera del contenedor angosto, con eyebrow y subtítulo proyectados. Las portadas salen de las actividades (únicas, solo con imagen) y un `linkedSignal` conserva el último mosaico mientras carga otra página o filtro.
- `franchise-detail`: sin `ProgressMeter`; el `title` de "Track saga" ya no menciona progreso.
- `profile-sagas`: cada fila muestra el nombre y "N games", sin barra, sin "x/y" y sin trofeo; texto del vacío sin progreso.
- `game-hero`: el enlace a la saga ya no muestra "x/y".
- Botones "Track saga" y "Show all" usan `tap:` para sus 44 px.

## Files of interest

- `apps/web/src/app/features/feed/feed-page.ts`
- `apps/web/src/app/features/public-profile/components/profile-sagas.ts`
- `apps/web/src/app/features/franchises/franchise-detail/franchise-detail.html`

## Commits

- `b9a59997` — feat(feed): show library hero with game poster mosaic
- `327a0c8b` — refactor(franchises): remove saga progress from franchise detail
- `a945ce59` — refactor(public-profile): drop saga progress from profile sagas
- `4b497453` — refactor(game-detail): drop saga progress from the franchise link
- `61017ef1` — style(web): use tap variant for saga track and show all buttons
