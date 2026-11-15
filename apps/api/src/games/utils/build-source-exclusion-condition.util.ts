import { Op } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import { type SourceExclusionTable } from "../games.types";

export function buildSourceExclusionCondition(
	table: SourceExclusionTable,
	sources: readonly string[] | undefined
): object | null {
	if (!sources || sources.length === 0) return null;
	const escaped = sources.map(source => sequelize.escape(source)).join(", ");
	return {
		id: {
			[Op.notIn]: sequelize.literal(
				`(SELECT DISTINCT "gameId" FROM "${table}" WHERE source IN (${escaped}))`
			)
		}
	};
}
