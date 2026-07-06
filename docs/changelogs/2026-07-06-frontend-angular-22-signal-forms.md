# Frontend: Migración a Angular 22 + Signal Forms

**Released:** 2026-07-06

## Summary

Este changelog documenta trabajo del repo hermano `completr-node-frontend`, registrado aquí para coordinar el release. Se migró la app Angular de la 21.2 a la **22 con TypeScript 6**, y se aprovechó el salto para unificar toda la gestión de formularios bajo **Signal Forms**, el sistema signal-first estabilizado en v22. La app ya era zoneless y standalone, así que la migración del core fue de bajo riesgo; el grueso del esfuerzo fue reescribir los 12 formularios reales (que usaban Reactive Forms o `ngModel`) a Signal Forms, y convertir los inputs transitorios restantes (filtros, búsqueda, quick-edits) a binding manual `[value]`/`(input)` sobre signals. Resultado: **cero `ReactiveFormsModule`, `FormGroup`, `FormBuilder`, `FormsModule` y `ngModel` en toda la app** — un solo paradigma de signals. Cada formulario se verificó antes/después con puppeteer (validación, submit, two-way binding) contra un baseline v21, incluyendo CRUD real contra la base de datos local.

## Highlights

- Angular 22 + TypeScript 6 con adopción de defaults de v22: `OnPush` en `App`, safe-navigation narrowing y `FetchBackend`.
- Los 12 formularios de la app migrados a Signal Forms (`form()` + `[formField]`), con validación declarativa y tipada.
- Un solo paradigma: Signal Forms para formularios reales, signals + `[value]`/`(input)` para inputs transitorios. Cero `ngModel` en toda la app.
- Verificación end-to-end con puppeteer: smoke de navegación sin regresiones + 10 suites de interacción (incluye crear/editar juego admin, crear entrada de backlog y publicar review contra la DB local).

## Changed

- Core actualizado a Angular 22.0.5, CDK 22 y TypeScript 6; `ng-primitives` a 0.124.0.
- Los 12 formularios reactivos/template-driven migrados a Signal Forms: `login`, `register`, `list-modal`, `duplicate-list-modal`, `backlog-modal`, `game-shelf-modal`, `settings-profile`, `settings-security`, `game-reviews-tab`, `admin-game-editor`.
- 6 componentes de filtros/búsqueda (`backlog-list`, `saved-filters-view`, `admin-users`, `tags-page`, `game-detail`, `games-browse`) pasaron de `ngModel` a `[value]`/`(input|change|checked)` sobre sus signals.
- HTTP adopta `FetchBackend` (default de v22) en `app.config.ts`.
- Dev tooling actualizado (eslint, prettier, vitest, tailwind, jsdom) y `npm audit fix`.

## Removed

- Toda dependencia de `ReactiveFormsModule`, `FormGroup`, `FormBuilder`, `FormsModule` y `ngModel`.
- `withXhr()` de `provideHttpClient` (se adopta el `FetchBackend` por defecto).
- Wrappers `$safeNavigationMigration(...)` que dejó el codemod de v22 (11 en 7 templates), tras confirmar que el narrowing nuevo los hace innecesarios.
- Import muerto de `FormsModule` en `mood-tags-input` (es un input controlado, no un form).

## Migration

- **Gotcha del submit:** quitar `ReactiveFormsModule` elimina la directiva `(ngSubmit)`, que pasa a ser un no-op silencioso y deja que el navegador haga un POST nativo (reload). En cada `<form>` se reemplazó `(ngSubmit)="onSubmit()"` por `(submit)="onSubmit($event)"` + `event.preventDefault()`.
- **Atributos de validación en el DOM:** `[formField]` rechaza `min`/`max`/`maxlength` como atributos HTML (NG8022) porque Signal Forms los refleja desde el schema; se movieron al schema (`maxLength(path.x, 100)`, `min(path.score, 0.01)`).
- **Design-system:** `uiInput`/`uiTextarea`/`uiSelect` son directivas de estilo sobre elementos nativos, así que `[formField]` enlaza el nativo directo y el estado de validación de ng-primitives (`data-invalid`/`data-dirty`) sigue fluyendo.
- **Estado mixto:** en `game-reviews-tab` se separó el estado de UI (`show`, `submitting`) de los datos del form (`content`, `rating`), que quedaron en el `form()`.

## Files of interest

Rutas del repo `completr-node-frontend`:

- `src/app/app.config.ts` — `FetchBackend`, providers.
- `src/app/features/backlog/backlog-modal/` — el formulario más complejo migrado.
- `src/app/features/games/admin-game-editor/` — form admin de ~830 líneas (escalares en Signal Forms, editores de colección en binding manual).
- `src/app/features/auth/login/`, `src/app/features/auth/register/` — auth en Signal Forms.
- `eslint.config.js` — ignores de directorios generados; `tsconfig.app.json` — supresiones de diagnósticos del codemod v22.

## Commits

Commits del repo `completr-node-frontend` (rama `chore/angular-22`, mergeada a `develop`):

- `17a78887` — chore(deps): bump ng-primitives to 0.124.0 for Angular 22 support
- `016e80f3` — chore(deps): bump typescript-eslint to 8.62.1 for TypeScript 6 support
- `f4019b3e` — chore(deps): upgrade to Angular 22, CDK 22 and TypeScript 6
- `34266b36` — refactor(templates): adopt Angular 22 safe-navigation narrowing, drop migration wrappers
- `28591261` — refactor(http): adopt Angular 22 FetchBackend default, drop withXhr
- `7b5f3108` — refactor(lists): migrate list-modal form to Angular 22 Signal Forms
- `9e1c8730` — refactor(auth): migrate login and register forms to Signal Forms
- `44cd8d36` — refactor(backlog): migrate backlog-modal form to Signal Forms
- `0eb8b6f4` — refactor(game-shelf): migrate game-shelf-modal form to Signal Forms
- `4724b75c` — refactor(lists): migrate duplicate-list-modal form to Signal Forms
- `71b1d09a` — refactor(settings): migrate profile and security forms to Signal Forms
- `a7dd3d52` — refactor(reviews): migrate review composer to Signal Forms
- `c7c92907` — refactor(mood-tags): drop unused FormsModule import
- `3416e2d0` — refactor(admin): migrate admin-game-editor form to Signal Forms
- `9630d1f8` — chore(deps): update dev tooling (eslint, prettier, vitest, tailwind, jsdom) and audit fix
- `c0aefee5` — test(app): fix stale scaffold spec to match router-outlet App
- `da872616` — refactor: replace ngModel with signal value bindings, drop FormsModule app-wide
