import { randomUUID } from "node:crypto";

import { sequelize } from "../../src/database/sequelize.database";

export async function countQueries(action: () => Promise<unknown>) {
	const hookName = `query-counter-${randomUUID()}`;
	let count = 0;
	sequelize.addHook("beforeQuery", hookName, () => {
		count++;
	});
	try {
		await action();
	} finally {
		sequelize.removeHook("beforeQuery", hookName);
	}
	return count;
}
