import { Op } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import { type AggregateColumn, type AggregateTable } from "../games.types";

export function buildAggregateCondition(
	table: AggregateTable,
	column: AggregateColumn,
	min: number | undefined,
	max: number | undefined
): object | null {
	if (min === undefined && max === undefined) return null;
	const conditions: string[] = [];
	if (min !== undefined)
		conditions.push(`AVG(${column}) >= ${sequelize.escape(min)}`);
	if (max !== undefined)
		conditions.push(`AVG(${column}) <= ${sequelize.escape(max)}`);
	return {
		id: {
			[Op.in]: sequelize.literal(
				`(SELECT "gameId" FROM "${table}" GROUP BY "gameId" HAVING ${conditions.join(" AND ")})`
			)
		}
	};
}
