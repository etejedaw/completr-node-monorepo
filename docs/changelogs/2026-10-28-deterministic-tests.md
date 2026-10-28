# Tests deterministas

**Released:** 2026-10-28

## Summary

Al correr las suites completas varias veces sin cambios en el código, algunas corridas fallaban y otras no. Se encontraron tres causas, y las tres se corrigieron:

- **Toasts entre archivos (web).** Varios specs definían `Element.prototype.getAnimations` al empezar y lo borraban al terminar. Un toast cuyo temporizador seguía vivo podía cerrarse después del borrado, ya con otro archivo en curso, y `ng-primitives` fallaba al llamarlo.
- **Velocidad de la máquina (web).** Algunos specs suponían que entre dos pasos pasaba menos tiempo real que un margen o un debounce.
- **Empates de orden (API).** Las consultas ordenadas solo por fecha no tenían desempate, así que dos filas con el mismo timestamp salían en orden arbitrario.

Tras los cambios, tres corridas seguidas de cada suite dan el mismo resultado.

## Highlights

- `src/test-environment.ts` (`setupFiles` del target `test`) completa una sola vez lo que jsdom no implementa.
- Los specs que dependen del tiempo fijan el reloj o disparan los eventos en el mismo turno.
- Todos los listados de la API desempatan por `id` en la misma dirección de su orden.

## Added

- `apps/web/src/test-environment.ts`, registrado en `angular.json` y en `tsconfig.spec.json` y excluido de `tsconfig.app.json`.
- Tests del límite del margen de apertura en `ui-dialog.spec.ts` y `ui-bottom-sheet.spec.ts`: a los 399 ms el fondo se ignora y a los 400 ms cierra.

## Changed

- Los specs ya no definen ni borran `getAnimations` por su cuenta.
- `ui-dialog.spec.ts` y `ui-bottom-sheet.spec.ts` fijan `performance.now()`.
- Los tests de debounce de admin/games y del modal de sagas disparan las teclas con `fireEvent.input` en el mismo turno.
- 62 consultas de la API suman `["id", <dirección>]` como desempate a su orden: listados de backlog, listas, actividad, auditoría, usuarios, seguidores, favoritos, wishlist, queue, reviews, invitaciones, jobs y otros.
- `docs/context/frontend.md` documenta el entorno común de los specs y la regla de determinismo, y `docs/invariants.md` documenta el desempate por `id`.

## Fixed

- `admin-invitations.integration.test.ts` hacía más vieja una invitación con `instance.update({ createdAt })`, que Sequelize ignora. Ahora usa `UserInvitation.update(..., { silent: true })` y comprueba que la fecha cambió.
- La paginación de los listados de la API ya no repite ni salta filas cuando dos registros comparten el valor de orden.

## Files of interest

- `apps/web/src/test-environment.ts`
- `apps/web/angular.json`
- `apps/api/src/lists/lists.service.ts`

## Commits

- `33c1a9c2` — fix(api): break ordering ties by id in every sorted listing
- `52146d3b` — test(api): backdate the invitation fixture with a silent update
- `27863b12` — test(web): make dialog and debounce specs independent of machine speed
- `a4845541` — test(web): load the jsdom animation shim once for the whole suite
- `74df8768` — docs: document deterministic tests and id tie-breaking in listings
