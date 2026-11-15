import { Op } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import { type MissingRelationTable } from "../games.types";

export function buildMissingRelationCondition(
	table: MissingRelationTable
): object {
	return {
		id: {
			[Op.notIn]: sequelize.literal(
				`(SELECT DISTINCT "gameId" FROM "${table}")`
			)
		}
	};
}
