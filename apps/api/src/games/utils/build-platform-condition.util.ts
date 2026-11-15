import { Op } from "sequelize";

import { sequelize } from "../../database/sequelize.database";

export function buildPlatformCondition(
	codes: readonly string[] | undefined
): object | null {
	if (!codes || codes.length === 0) return null;
	const escaped = codes.map(code => sequelize.escape(code)).join(", ");
	return {
		id: {
			[Op.in]: sequelize.literal(
				`(SELECT DISTINCT gp."gameId" FROM "GamePlatforms" gp JOIN "Platforms" p ON p.id = gp."platformId" WHERE p.code IN (${escaped}))`
			)
		}
	};
}
