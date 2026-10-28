# Admin a prueba de usuarios erráticos

**Released:** 2026-10-27

## Summary

Cada vista del admin tiene un `<pantalla>.interaction.spec.ts` que simula a un usuario impredecible. Los specs hacen doble y triple clic, cierran diálogos a mitad de una petición y escriben y borran rápido. También prueban texto en blanco, emoji o HTML, respuestas que llegan fuera de orden y errores 500, 409, 404, 422 y de red. Los specs destaparon unos 45 bugs, y todos se corrigieron con su test. Los patrones repetidos fueron cuatro: acciones sin bloqueo que mandaban peticiones duplicadas, cargas que no cancelaban la anterior y dejaban que una respuesta vieja pisara a la nueva, `subscribe` sin manejo de error y guardados que enviaban datos que el diálogo no había llegado a cargar. Al verificar con el navegador apareció un bug de toda la app: un doble clic en un botón que abre un diálogo lo cerraba al instante, porque el segundo clic caía sobre el fondo.

## Highlights

- Specs de interacción para users, invitaciones, games, franchises, el modal de sagas, reports, audit, jobs y el editor de juegos (Split y Compilation incluidos).
- `UiDialog` y `UiBottomSheet` ignoran el fondo durante los primeros 400 ms, así que un doble clic ya no cierra el diálogo que acaba de abrir.
- Los errores del servidor en los formularios del admin se ocultan en cuanto el usuario cambia el valor que los produjo.

## Added

- `*.interaction.spec.ts` en `admin-users`, `admin-reports`, `admin-games`, `admin-franchises`, `admin-franchise-modal`, `admin-audit`, `admin-jobs` y `admin-game-editor`.
- Specs `ui-dialog.spec.ts` y `ui-bottom-sheet.spec.ts`.
- Margen de apertura `BACKDROP_OPENING_GRACE_MS` (400 ms) en `UiDialog` y `UiBottomSheet`.
- Errores visibles con `computed` en `AdminUsers` (`visibleCreateFieldErrors`, `visibleCreateError`, `visibleEditFieldErrors`, `visibleEditError`), `AdminInvitations` (`visibleInviteError`) y `AdminFranchiseModal` (`visibleError`). Al fallar se guarda una foto de los valores enviados, y el error se oculta mientras el valor actual difiera de ella.

## Fixed

- Reports: Approve y Reject se bloquean por tarjeta mientras dura la petición, avisan con un toast si fallan y la lista cancela la carga anterior.
- Games: la lista cancela la carga anterior con `switchMap`, la búsqueda espera 250 ms después de la última tecla y la paginación se ve también al buscar. Una página que queda vacía tras desactivar o reactivar salta a la última con datos. Los fallos de `/score-sources` y de los reportes ya no quedan sin manejar.
- Modal de sagas:
    - Con más de 100 juegos, la lista de juegos se bloquea y no se envía `gameIds`, para no desvincular los que no se cargaron.
    - En edición, `gameIds` solo se envía si la lista cambió.
    - Save se deshabilita mientras cargan los juegos, y un fallo de carga muestra un aviso con reintento.
    - La búsqueda sobrevive a un error, Cancel se bloquea mientras guarda y un nombre de solo espacios se rechaza.
- Franchises: un 404 al borrar recarga la lista.
- Users: un nombre de solo espacios se rechaza en Create y Edit, y el botón de mostrar contraseña se reinicia al reabrir.
- Invitaciones: un fallo al cargar muestra un aviso con "Try again" en lugar de "No pending invitations".
- Editor de juegos:
    - Enter repetido en los slugs de RAWG y del padre no repite la petición, y una respuesta vieja de RAWG no pisa a la nueva.
    - El título se guarda recortado.
    - Las filas de Compilation tienen `id` estable y cada búsqueda se cancela al volver a escribir, cambiar de modo, quitar la fila o cerrar.
    - Split y Compilation rechazan títulos sin slug o con slugs repetidos, y la vista previa del slug quita los diacríticos como el servidor.
    - Los errores de validación se limpian al editar las filas.
    - El propio juego no se ofrece ni se acepta como parte de su compilación.
    - Abrir Split o Compilation estando abiertos no borra lo escrito.
    - Al editar un DLC se ve su juego padre.
- Audit y jobs: las cargas cancelan la anterior. Cancel de un job se bloquea mientras dura la petición y avisa si falla.
- `ScoreSourcesService.load()` ya no deja un error sin manejar si `/score-sources` falla.

## Changed

- `docs/context/frontend.md` documenta cómo los formularios del admin ocultan los errores del servidor.

## Files of interest

- `apps/web/src/app/shared/ui/dialog/ui-dialog.ts`
- `apps/web/src/app/features/admin/admin-franchise-modal/admin-franchise-modal.ts`
- `apps/web/src/app/features/games/admin-game-editor/admin-game-editor.ts`
- `apps/web/src/app/features/games/admin-game-editor/admin-game-editor.interaction.spec.ts`

## Commits

- `0a4820db` — fix(web): keep dialogs open when a double click lands on the backdrop
- `d86b78f8` — fix(web): ignore score sources load failures
- `a9b45cfa` — fix(web): guard admin users dialogs against blank names and stale password toggles
- `d3cdaca8` — fix(web): show admin invitations load failures with a retry
- `07d8ea17` — fix(web): prevent duplicate and stale admin report actions
- `a3eb1792` — fix(web): cancel stale admin games loads and keep pagination while searching
- `1cece8eb` — fix(web): reload admin franchises when a deleted franchise is already gone
- `76bb7d35` — fix(web): stop the franchise modal from wiping games it did not load
- `9760d061` — fix(web): harden the admin game editor against repeated and stale requests
- `1bc5578c` — fix(web): drop stale admin audit responses
- `b48debfc` — fix(web): prevent duplicate and unhandled admin job cancels
- `91a23c36` — fix(web): hide admin server errors once the failing value changes
- `f08515fa` — docs(web): document how admin forms hide stale server errors
