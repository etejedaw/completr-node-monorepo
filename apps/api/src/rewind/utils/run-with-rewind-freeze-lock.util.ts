import { sequelize } from "../../database/sequelize.database";
import { REWIND_FREEZE_LOCK_KEY } from "../rewind.constants";
import { type AdvisoryLockConnection } from "../rewind-freeze.interface";

const TRY_LOCK_QUERY = "SELECT pg_try_advisory_lock(hashtext($1)) AS locked";
const UNLOCK_QUERY = "SELECT pg_advisory_unlock(hashtext($1))";

export async function runWithRewindFreezeLock<T>(
	work: () => Promise<T>
): Promise<T | null> {
	const { connectionManager } = sequelize;
	const connection = (await connectionManager.getConnection({
		type: "write"
	})) as AdvisoryLockConnection;
	try {
		const { rows } = await connection.query(TRY_LOCK_QUERY, [
			REWIND_FREEZE_LOCK_KEY
		]);
		if (rows[0]?.locked !== true) return null;
		try {
			return await work();
		} finally {
			await connection.query(UNLOCK_QUERY, [REWIND_FREEZE_LOCK_KEY]);
		}
	} finally {
		connectionManager.releaseConnection(connection);
	}
}
