import { sequelize } from "../../database/sequelize.database";
import { type CompactPositionsOptions } from "../interfaces/compact-positions-options.interface";

export async function compactPositions({
	table,
	ownerColumn,
	ownerIds,
	transaction
}: CompactPositionsOptions) {
	await sequelize.query(
		`UPDATE "${table}" AS target
		SET "position" = ranked."position", "updatedAt" = NOW()
		FROM (
			SELECT "id", ROW_NUMBER() OVER (PARTITION BY "${ownerColumn}" ORDER BY "position", "createdAt", "id") AS "position"
			FROM "${table}"
			WHERE "${ownerColumn}" IN (:ownerIds)
		) AS ranked
		WHERE target."id" = ranked."id" AND target."position" <> ranked."position"`,
		{ replacements: { ownerIds }, transaction }
	);
}
