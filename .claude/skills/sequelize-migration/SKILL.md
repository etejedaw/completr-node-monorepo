---
name: sequelize-migration
description: Create a Sequelize migration whenever a Sequelize model is created or modified in a way that changes the DB schema (new model, new/removed/renamed column, type change, default change, nullability, unique/index, FK, enum value). Applies to files using Model.init, sequelize.define or sequelize-typescript decorators. Skip if the change is purely TypeScript-side (typings, getters, hooks without DDL impact). Uses sequelize-cli and, on PostgreSQL, raw idempotent SQL.
license: Apache-2.0. Complete terms in LICENSE
---

# Sequelize Migration

Cada vez que se **crea o modifica** un modelo de Sequelize y el cambio impacta el esquema de la base, hay que generar una migración. Esto incluye los archivos de tipos usados como `DataTypes.ENUM(...)` dentro de un modelo.

> **Antes de tocar un modelo, pide confirmación al usuario.** La skill se aplica una vez que hay luz verde para cambiar el modelo.

## Configuración del proyecto

Antes de crear la migración, averigua cómo trabaja el proyecto. Lo que defina el `CLAUDE.md` del proyecto manda sobre todo lo demás.

| Ajuste                  | Dónde mirarlo                                                           | Por defecto                                            |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| Carpeta de migraciones  | `migrations-path` en `.sequelizerc`                                     | `migrations/`                                          |
| Comando para crear      | Script de `package.json` que llame a `sequelize-cli migration:generate` | `npx sequelize-cli migration:generate --name <nombre>` |
| Dialecto                | `dialect` en la config de la base                                       | PostgreSQL                                             |
| Formato del archivo     | Las migraciones existentes                                              | CommonJS (`module.exports = { up, down }`), `.js`      |
| Archivo de asociaciones | Donde se llamen `hasMany`, `belongsTo`, etc.                            | —                                                      |

Si ya hay migraciones en la carpeta, **la más reciente es la referencia de estilo**: formato, indentación, comillas y forma de escribir el DDL. Si no hay, usa el estilo del resto del código.

## Cuándo aplicar

| Cambio en el modelo                                                                               | ¿Migración? |
| ------------------------------------------------------------------------------------------------- | ----------- |
| Modelo nuevo (clase + `Model.init`, `sequelize.define` o `@Table`)                                | Sí          |
| Columna nueva / borrada / renombrada                                                              | Sí          |
| Cambio de tipo, longitud, `defaultValue`, `allowNull`, `unique`, `primaryKey`                     | Sí          |
| Nuevo índice, índice compuesto, FK / asociación que requiere columna o constraint                 | Sí          |
| Valor agregado/quitado a un `ENUM` (incluye archivos de tipos referenciados con `DataTypes.ENUM`) | Sí          |
| Rename de la clase / tabla (cambia `tableName`)                                                   | Sí          |
| Solo `declare` de TS, hooks JS, scopes, getters/setters en memoria                                | No          |
| Refactor de imports, mover archivos sin cambiar shape                                             | No          |

Si dudas, genérala: una migración idempotente sin diff efectivo es barata; un drift entre modelo y base no.

## Cómo crear la migración

1. **Scaffold con el comando del proyecto** (genera el timestamp correctamente). Ejemplo con un script de npm workspaces: `npm run migrate:create -w apps/api -- add-isfeedpublic-to-users`.
2. **Reescribir el contenido** siguiendo el template de abajo. El scaffold de sequelize-cli usa la API de `queryInterface` (`addColumn`, etc.); en PostgreSQL se prefiere **SQL crudo idempotente** porque maneja mejor los enums y permite reruns. En otros dialectos, o si las migraciones existentes usan `queryInterface`, sigue lo que ya hay.

## Naming

Filename: `YYYYMMDDHHMMSS-<verbo>-<sujeto>.js`

- Verbos canónicos: `add`, `remove`, `rename`, `change`, `create`, `drop`, `add-index`, `add-fk`.
- Ejemplos válidos:
    - `20260501120000-create-game-reports.js`
    - `20260501120500-add-isfeedpublic-to-users.js`
    - `20260501121000-change-bio-length-on-users.js`
    - `20260501121500-add-status-value-to-backlogs-status-enum.js`

## Granularidad: una migración por unidad lógica, no por columna

Agrupar todos los cambios de base que pertenecen a **la misma feature / unidad de cambio** en una sola migración. No fragmentar por columna ni por sentencia DDL.

**Sí agrupar** cuando:

- Los cambios pertenecen a la misma feature o PR.
- Son sobre la misma tabla o tablas relacionadas que se aplican juntas (columna nueva + su índice + su FK).
- Revertir uno sin los otros dejaría la app en estado inconsistente.

**No agrupar** cuando:

- Son features distintas que podrían mergearse o deployarse por separado.
- Tocan dominios sin relación.
- Una es DDL pesado (rebuild de índice, cambio de tipo en tabla grande) y la otra es trivial: separar da control fino del orden de ejecución.

Naming en migraciones agrupadas: usar un sujeto que cubra la feature, no una lista. `add-public-profile-fields-to-users` mejor que `add-isPublic-isWishlistPublic-isFavoritePublic-to-users`.

## Template

```js
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			-- DDL idempotente
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			-- Reverso del up, también idempotente
		`);
	}
};
```

## Reglas de DDL (PostgreSQL)

- **Identificadores con mayúsculas o camelCase van entre comillas dobles**: `"Users"`, `"isFeedPublic"`, `"createdAt"`. Sequelize crea tablas en plural (`Users`, `GameReports`) y columnas en camelCase por defecto, así que casi todo va entre comillas. Si el modelo define `tableName` o el proyecto usa `underscored: true`, respeta eso.
- **Idempotencia siempre**:
    - `CREATE TABLE IF NOT EXISTS`
    - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
    - `ALTER TABLE ... DROP COLUMN IF EXISTS`
    - `CREATE INDEX IF NOT EXISTS`
    - `DROP INDEX IF EXISTS`
    - Para crear enums, envolver en `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;`.
- **Defaults con UUID**: `gen_random_uuid()` (nativo desde PostgreSQL 13; en versiones anteriores requiere `pgcrypto`).
- **Timestamps**: `"createdAt"` y `"updatedAt"` siempre `TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()` al crear una tabla (Sequelize las espera, salvo `timestamps: false`).
- **FKs**: declararlas con `REFERENCES "Tabla"(id) ON DELETE CASCADE|SET NULL` y **siempre igual al `onDelete` de la asociación** en el modelo. Si el proyecto no usa `sync()`, el `onDelete` de la asociación nunca llega a la base: si la migración lo omite, borrar el padre falla con `23503` y la API responde 500. Al tocar una asociación con `onDelete`, revisa que la FK de la migración lo tenga.
- **Enums**: el tipo se llama `enum_<Tabla>_<columna>` por convención de Sequelize (ej: `enum_Users_role`). Para agregar un valor: `ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS 'newvalue';` (`IF NOT EXISTS` existe desde PostgreSQL 12).

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
async down() {}
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

El `down` debe revertir el `up`. Excepción: PostgreSQL no permite quitar un valor de un enum sin recrear el tipo. Al agregar un valor, deja `async down() {}` y avísale al usuario del riesgo.

## Antes de cerrar el cambio

1. Filename con timestamp UTC correcto (lo da el scaffold de sequelize-cli).
2. `up` y `down` ambos idempotentes (rerun-safe).
3. Identificadores entre comillas donde corresponde.
4. El modelo ya tiene la columna (y su `declare` en TS) antes de pedirle al usuario correr la migración.
5. Avisar al usuario: "migración lista en `<carpeta>/<archivo>.js`, córrela con `<comando del proyecto>` cuando quieras aplicarla". **No correrla tú**, ni en desarrollo ni en producción.
