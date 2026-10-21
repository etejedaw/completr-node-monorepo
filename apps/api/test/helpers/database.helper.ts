import { after, before } from "node:test";

import { QueryTypes } from "sequelize";

import { initDatabase } from "../../src/database/init.database";
import { sequelize } from "../../src/database/sequelize.database";

const MIGRATIONS_TABLE = "SequelizeMeta";

export async function truncateAllTables() {
	const tables = await sequelize.query<{ tablename: string }>(
		`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> :migrationsTable`,
		{
			replacements: { migrationsTable: MIGRATIONS_TABLE },
			type: QueryTypes.SELECT
		}
	);
	if (tables.length === 0) return;

	const tableList = tables
		.map(({ tablename }) => `"${tablename}"`)
		.join(", ");
	await sequelize.query(`TRUNCATE ${tableList} RESTART IDENTITY CASCADE`);
}

export function useTestDatabase(seed?: () => Promise<void>) {
	before(async () => {
		await initDatabase();
		await truncateAllTables();
		await seed?.();
	});

	after(async () => {
		await sequelize.close();
	});
}
