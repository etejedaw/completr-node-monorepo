import { Op, where as whereFn } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import { CANONICAL_SCORE_SUBQUERY } from "../games.constants";

export function buildCanonicalScoreCondition(
	min: number | undefined,
	max: number | undefined
): object | null {
	if (min === undefined && max === undefined) return null;
	const canonicalScore = sequelize.literal(CANONICAL_SCORE_SUBQUERY);
	const conditions = [];
	if (min !== undefined)
		conditions.push(whereFn(canonicalScore, Op.gte, min));
	if (max !== undefined)
		conditions.push(whereFn(canonicalScore, Op.lte, max));
	return { [Op.and]: conditions };
}
