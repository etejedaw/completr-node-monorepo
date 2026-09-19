# Reorganización de services y componentes

**Released:** 2026-06-22

## Summary

Refactor sin cambios de comportamiento en las dos apps, para partir archivos que habían crecido demasiado. En el backend, `games` y `users` separan sus services por responsabilidad y la composición de vistas deja los controllers. En el frontend, los services "god" de `public-profile` y `admin` se dividen, `game-detail` agrupa su estado y extrae subcomponentes, y los archivos de services pierden el sufijo `.service`.

## Changed

### Backend

- `games.service` se divide en `games-search`, `games-variant`, `games-compilation` y `games-profile`, agrupados en `games/services/`. Los filtros de búsqueda pasan a `games/utils/search-filters.util.ts`.
- `users` separa `users-admin.controller` y mueve la composición del perfil y de sus subvistas a `users-profile.service` y a los serializers.
- `theme-catalog.ts` pasa a `users/constants/theme.constants.ts`; los helpers y constantes de `users` se agrupan en subcarpetas.
- Nuevo helper `common/errors/sequelize-error.mapper.ts` (`rethrowSequelizeError`) para unificar el manejo de errores de Sequelize.
- Nuevo helper `common/utils/sequelize-range.util.ts` (`buildRangeWhere`), usado por los filtros de `backlog` y `games`.

### Frontend

- `public-profile` divide su service en cinco services cohesivos (`public-library`, `public-lists`, `public-reviews`, etc.); `admin` en cuatro.
- `game-detail` agrupa 24 signals en 5 objetos de estado y extrae `game-reviews-tab`, `game-social-activity` y `game-add-to-list-modal`.
- `backlog-list` unifica los signals de estado pendiente en un solo objeto.
- Util `core/utils/http-params.ts` (`buildHttpParams`) y helper `postAuth` en el servicio de auth.
- Los archivos de services se renombran sin el sufijo `.service`.
- `layout` usa `OnPush`; `backlog-list` registra el click de documento con host binding.

### Removed

- Template boilerplate de Angular en `app.html`, `standalone: true` redundante y comentarios que el código ya explica.

## Files of interest

- `apps/api/src/games/services/`
- `apps/api/src/users/users-profile.service.ts`
- `apps/api/src/common/errors/sequelize-error.mapper.ts`
- `apps/web/src/app/features/public-profile/services/`
- `apps/web/src/app/features/games/game-detail/components/`

## Commits

### Backend

- `dd22acf2` — refactor(games): split games.service into search, variant and compilation services
- `3920ba11` — refactor(games): extract findAll filter builders into utils helper
- `55135242` — refactor(users): split controller and move profile composition into a service
- `ddeba5da` — refactor(games): move composed handlers into profile service and serializers
- `60ac025d` — refactor(errors): unify sequelize error handling via rethrowSequelizeError helper
- `9d783daa` — refactor(games): nest query options and group services into subfolder
- `24aa753f` — refactor(common): extract buildRangeWhere helper and reuse across backlog and games filters
- `f55e144c` — refactor(users): move profile sub-views composition into service and serializers
- `b8fbee4d` — refactor(users): split theme module and group helpers and constants into subfolders

### Frontend

- `4707aa22` — chore(app): remove unused angular boilerplate template
- `df1e4a23` — style: strip code comments per clean code
- `0d7f29ff` — style: remove redundant standalone true from components
- `9e5d15b1` — refactor(backlog): move document click listener to host binding
- `85339ffb` — perf(layout): enable onpush change detection
- `d541d4ae` — refactor: rename service files to drop .service suffix
- `9990dcd8` — refactor(http): extract buildHttpParams utility to remove duplication
- `a6c53835` — refactor(public-profile): split god service into 5 cohesive services
- `93bef524` — refactor(admin): split god service into 4 cohesive services
- `2f1db314` — refactor(game-detail): group 24 signals into 5 state objects
- `cc5dccc8` — refactor(backlog-list): unify pending status signals into one state object
- `3eae02eb` — refactor(game-detail): extract reviews/social/add-to-list into subcomponents
- `8ea248cb` — refactor(auth): extract postAuth helper for login/register/refresh
- `df9ef044` — style(theme): rename find callback param t to theme
- `6649df56` — refactor(admin/audit): extract AuditActor and AuditTarget types
