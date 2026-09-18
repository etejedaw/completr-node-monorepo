---
name: db-migration
description: Create a Sequelize migration in apps/api/migrations whenever a *.model.ts file is created or modified in a way that changes the DB schema (new model, new/removed/renamed column, type change, default change, nullability, unique/index, FK, enum value). Skip if the change is purely TypeScript-side (typings, getters, hooks without DDL impact). Uses sequelize-cli + raw SQL idempotent DDL on PostgreSQL.
---

# DB Migration

Cada vez que se **crea o modifica** un `*.model.ts` y el cambio impacta el esquema de la base, hay que generar una migración en `apps/api/migrations/`. Esto incluye también ediciones a `*-role.type.ts` u otros types usados como `DataTypes.ENUM(...)` dentro de un model.

> **Antes de tocar un modelo, recordá pedir confirmación al usuario** (ver `feedback_no_db_changes_without_asking.md`). La skill se aplica una vez ya hay luz verde para cambiar el modelo.

## Cuándo aplicar

| Cambio en `*.model.ts`                                                                                 | ¿Migración? |
| ------------------------------------------------------------------------------------------------------ | ----------- |
| Modelo nuevo (clase + `Model.init`)                                                                    | Sí          |
| Columna nueva / borrada / renombrada                                                                   | Sí          |
| Cambio de tipo, longitud, `defaultValue`, `allowNull`, `unique`, `primaryKey`                          | Sí          |
| Nuevo índice, índice compuesto, FK / asociación que requiere columna o constraint                      | Sí          |
| Valor agregado/quitado a un `ENUM` (incluye archivos `*-*.type.ts` referenciados con `DataTypes.ENUM`) | Sí          |
| Rename de la clase / tabla (cambia `tableName`)                                                        | Sí          |
| Solo `declare` de TS, hooks JS, scopes, getters/setters en memoria                                     | No          |
| Refactor de imports, mover archivos sin cambiar shape                                                  | No          |

Si dudás, generala: una migración idempotente sin diff efectivo es barata; un drift entre modelo y DB no.

## Stack

- ORM: `sequelize` 6 + `sequelize-cli` 6 (devDep)
- Dialecto: **PostgreSQL** (`pg`, `pg-hstore`)
- Carpeta: `apps/api/migrations/`
- Formato de archivo: **CommonJS** (`module.exports = { up, down }`), extensión **`.js`**
- Tabla de control: la default de sequelize-cli (`SequelizeMeta`)

## Cómo crear la migración

1. **Scaffold con el script existente** (genera el timestamp correctamente):

    ```bash
    npm run migrate:create -w apps/api -- nombre-en-kebab-case
    ```

    Ejemplo: `npm run migrate:create -w apps/api -- add-isfeedpublic-to-users` produce `apps/api/migrations/20260416035811-add-isfeedpublic-to-users.js`.

2. **Reescribir el contenido** siguiendo el template de la sección siguiente. El scaffold de sequelize-cli usa la API de `queryInterface` (addColumn, etc.); en este repo preferimos **SQL crudo idempotente** porque maneja mejor enums y permite reruns.

3. **No correr `npm run migrate` automáticamente.** Avisar al usuario que la migración está lista y dejar que él la corra (igual que con cambios de modelo, ver feedback `no_db_changes_without_asking`).

## Naming

Filename: `YYYYMMDDHHMMSS-<verbo>-<sujeto>.js`

- Verbos canónicos: `add`, `remove`, `rename`, `change`, `create`, `drop`, `add-index`, `add-fk`.
- Ejemplos válidos:
    - `20260501120000-create-game-reports.js`
    - `20260501120500-add-isfeedpublic-to-users.js`
    - `20260501121000-change-bio-length-on-users.js`
    - `20260501121500-add-status-value-to-backlogs-status-enum.js`

## Granularidad: una migración por unidad lógica, no por columna

Agrupar todos los cambios de DB que pertenecen a **la misma feature / unidad de cambio** en una sola migración. No fragmentar por columna ni por sentencia DDL.

**Sí agrupar** cuando:

- Los cambios pertenecen a la misma feature o PR.
- Son sobre la misma tabla o tablas relacionadas que se aplican juntas (columna nueva + su índice + su FK).
- Revertir uno sin los otros dejaría la app en estado inconsistente.

**No agrupar** cuando:

- Son features distintas que podrían mergearse o deployearse por separado.
- Tocan dominios sin relación (ej: cambio en `Users` + cambio en `Backlogs` no vinculados).
- Una es DDL pesado (rebuild de índice, cambio de tipo en tabla grande) y la otra es trivial — separar da control fino del orden de ejecución.

Naming en migraciones agrupadas: usar un sujeto que cubra la feature, no una lista. `add-public-profile-fields-to-users` mejor que `add-isPublic-isWishlistPublic-isFavoritePublic-to-users`.

## Template

Indentación: **tabs** (matchear el estilo del repo). Comillas dobles para strings JS. SQL multilinea en backticks.

```js
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			-- DDL idempotente acá
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			-- Reverso del up, también idempotente
		`);
	}
};
```

## Reglas de DDL (Postgres)

- **Identificadores con mayúsculas o camelCase van entre comillas dobles**: `"Users"`, `"isFeedPublic"`, `"createdAt"`. Sequelize crea tablas en plural y columnas en camelCase, así que casi todo va quoteado.
- **Tablas en plural** (default de Sequelize): `Users`, `Lists`, `Backlogs`, `GameReports`. Excepción: si el modelo define `tableName` explícito, usar ese.
- **Idempotencia siempre**:
    - `CREATE TABLE IF NOT EXISTS`
    - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
    - `ALTER TABLE ... DROP COLUMN IF EXISTS`
    - `CREATE INDEX IF NOT EXISTS`
    - `DROP INDEX IF EXISTS`
    - Para enums, envolver en `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` (ver `20260415230802-initial-schema.js`).
- **Defaults con UUID**: usar `gen_random_uuid()` (extensión `pgcrypto`/`pgcrypto`-equivalente ya disponible, igual que el initial-schema).
- **Timestamps**: columnas `"createdAt"` y `"updatedAt"` siempre `TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()` cuando creás una tabla (Sequelize las espera).
- **FKs**: declararlas con `REFERENCES "Tabla"(id) ON DELETE CASCADE|SET NULL` según haga sentido en el modelo.
- **Enums**: el tipo se llama `enum_<Tabla>_<columna>` por convención de Sequelize (ej: `enum_Users_role`). Si agregás un valor: `ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS 'newvalue';` (no tiene `IF NOT EXISTS` antes de PG12 — acá sí está disponible).

## Ejemplos por tipo de cambio

### Agregar columna

```js
async up(queryInterface) {
	await queryInterface.sequelize.query(`
		ALTER TABLE "Users"
		ADD COLUMN IF NOT EXISTS "isFeedPublic" BOOLEAN DEFAULT true;
	`);
},
async down(queryInterface) {
	await queryInterface.sequelize.query(`
		ALTER TABLE "Users" DROP COLUMN IF EXISTS "isFeedPublic";
	`);
}
```

### Crear tabla

```js
async up(queryInterface) {
	await queryInterface.sequelize.query(`
		CREATE TABLE IF NOT EXISTS "GameReports" (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			"gameId" UUID NOT NULL REFERENCES "Games"(id) ON DELETE CASCADE,
			"reporterId" UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
			reason VARCHAR(500) NOT NULL,
			status "enum_GameReports_status" DEFAULT 'pending' NOT NULL,
			"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS "GameReports_gameId_idx" ON "GameReports"("gameId");
	`);
},
async down(queryInterface) {
	await queryInterface.sequelize.query(`
		DROP TABLE IF EXISTS "GameReports";
	`);
}
```

### Agregar valor a enum

```js
async up(queryInterface) {
	await queryInterface.sequelize.query(`
		ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS 'curator';
	`);
},
async down() {
	// Postgres no soporta DROP VALUE de un enum sin recrear el tipo.
	// Dejar el down vacío y documentar el riesgo, o recrear el enum si es crítico.
}
```

### Cambio de tipo / longitud

```js
async up(queryInterface) {
	await queryInterface.sequelize.query(`
		ALTER TABLE "Users" ALTER COLUMN bio TYPE VARCHAR(500);
	`);
},
async down(queryInterface) {
	await queryInterface.sequelize.query(`
		ALTER TABLE "Users" ALTER COLUMN bio TYPE VARCHAR(250);
	`);
}
```

### Índice (incluye unique compuesto)

```js
async up(queryInterface) {
	await queryInterface.sequelize.query(`
		CREATE UNIQUE INDEX IF NOT EXISTS "ListFollowers_listId_userId_uidx"
		ON "ListFollowers"("listId", "userId");
	`);
},
async down(queryInterface) {
	await queryInterface.sequelize.query(`
		DROP INDEX IF EXISTS "ListFollowers_listId_userId_uidx";
	`);
}
```

## Down obligatorio (con una excepción)

El `down` debe revertir el `up`. Excepción: agregar valores a un enum no se puede deshacer fácil en Postgres — en ese caso dejar `async down() {}` y mencionarlo en el mensaje de commit.

## Commit

Mensaje conventional, single-line (ver `feedback_commit_style.md`):

- `feat(db): add isFeedPublic to users` (cuando viene con feature)
- `chore(db): rename column X to Y on backlogs`
- `fix(db): backfill default for status on backlogs`

Si la migración acompaña un cambio de modelo + lógica, puede ir en el mismo commit que la feature; si es solo schema, va sola.

## Antes de cerrar el cambio

1. Filename con timestamp UTC correcto (lo da `npm run migrate:create`).
2. `up` y `down` ambos idempotentes (rerun-safe).
3. Identificadores quoteados donde corresponde (todo lo camelCase y todas las tablas plural).
4. El modelo TS ya tiene los `declare` y la columna en `Model.init` antes de pedirle al usuario correr la migración.
5. Avisar al usuario: "migración lista en `apps/api/migrations/<file>.js`, corré `npm run migrate` cuando quieras aplicarla". **No correrla yo.**
