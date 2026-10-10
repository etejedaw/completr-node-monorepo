# Foreign key cascades

**Released:** 2026-10-10

## Summary

Varias FKs declaraban `onDelete: "CASCADE"` en `associations.database.ts`, pero en la DB se crearon sin `ON DELETE`. Por eso, borrar el padre fallaba con `23503` y la API respondía 500. Pasaba al borrar listas con actividad, al borrar backlogs que estaban en la cola y en el borrado físico de juegos. Una migración alinea esas FKs con sus asociaciones. Los borrados que siguen bloqueados por una FK legítima (plataformas, géneros o juegos en uso) ahora responden 409 en lugar de 500.

## Highlights

- Borrar una lista ya no falla por sus filas de `ActivityLists`.
- Borrar un backlog saca su entrada de la cola en vez de fallar.
- `DELETE` de plataformas, géneros y juegos en uso responde 409 con un código `<MODULO>_IN_USE`.

## Fixed

- `ON DELETE CASCADE` en `ActivityLists.listId`, `Queues.backlogId`, `RefreshTokens.userId` y en las 11 FKs a `Games` que la asociación ya declaraba con cascade.
- `Wishlists` no tenía FKs. Se agregan: `gameId` con cascade, y `userId` y `platformId` sin cascade. Antes se limpian las filas huérfanas.

## Added

- Clave `foreignKey` en `rethrowSequelizeError`, que mapea `ForeignKeyConstraintError` a un `ServiceError` del módulo.
- Errores `PLATFORM_IN_USE`, `GENRE_IN_USE` y `GAME_IN_USE` (409).

## Changed

- La asociación `Backlog.hasMany(Queue)` declara `onDelete: "CASCADE"`.
- `docs/architecture.md`, `docs/context/conventions.md` y `docs/context/modules.md`: cada FK declara en su migración el mismo `ON DELETE` que su asociación.
- Skill `db-migration`: la misma regla al escribir migraciones.

## Migration

- Ejecutar `npm run migrate`. La migración reemplaza las FKs buscándolas por columna, no por nombre, y corre en una transacción.

## Files of interest

- `apps/api/migrations/20261010204806-align-fk-cascades-with-associations.js`
- `apps/api/src/common/errors/sequelize-error.mapper.ts`
- `apps/api/src/database/associations.database.ts`

## Commits

- `70de2599` — fix(db): align foreign key cascades with associations
- `257fc237` — fix(api): return 409 when deleting platforms, genres or games still in use
- `b51ba0f3` — docs(repo): document that migrations own the database schema
- `7f34da0f` — chore(skills): require migration on delete rules to match associations
- `c4f41eee` — docs(repo): state foreign key cascade rules without rationale
