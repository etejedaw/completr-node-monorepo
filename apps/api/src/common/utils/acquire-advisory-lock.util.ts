import { type Transaction } from "sequelize";

import { sequelize } from "../../database/sequelize.database";

export async function acquireAdvisoryLock(
	lockKey: string,
	transaction: Transaction
) {
	await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:lockKey))", {
		replacements: { lockKey },
		transaction
	});
}
