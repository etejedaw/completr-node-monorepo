import { type Transaction } from "sequelize";

import { sequelize } from "../../database/sequelize.database";

const ORDERED_ADVISORY_LOCKS_SQL = `SELECT pg_advisory_xact_lock(hashtext("orderedKeys"."lockKey")) FROM (SELECT unnest(ARRAY[:lockKeys]::text[]) AS "lockKey" ORDER BY 1) AS "orderedKeys"`;

export async function acquireAdvisoryLocks(
	lockKeys: readonly string[],
	transaction: Transaction
) {
	if (lockKeys.length === 0) return;
	await sequelize.query(ORDERED_ADVISORY_LOCKS_SQL, {
		replacements: { lockKeys: [...lockKeys] },
		transaction
	});
}
