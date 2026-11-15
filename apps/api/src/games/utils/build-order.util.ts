import { type Order, type OrderItem } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import {
	CANONICAL_DURATION_SUBQUERY,
	CANONICAL_SCORE_SUBQUERY,
	POPULARITY_SUBQUERY
} from "../games.constants";

export function buildOrder(sortBy: string, sortOrder: string): Order {
	if (sortBy === "random") return [sequelize.literal("RANDOM()")];

	const direction = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
	return [sortExpression(sortBy, direction)];
}

function sortExpression(sortBy: string, direction: string): OrderItem {
	const nullsLast = `${direction} NULLS LAST`;
	if (sortBy === "score")
		return sequelize.literal(`${CANONICAL_SCORE_SUBQUERY} ${nullsLast}`);
	if (sortBy === "duration")
		return sequelize.literal(`${CANONICAL_DURATION_SUBQUERY} ${nullsLast}`);
	if (sortBy === "ratio")
		return sequelize.literal(
			`(${CANONICAL_SCORE_SUBQUERY} / NULLIF(${CANONICAL_DURATION_SUBQUERY}, 0)) ${nullsLast}`
		);
	if (sortBy === "popularity")
		return sequelize.literal(`${POPULARITY_SUBQUERY} ${nullsLast}`);
	return [sortBy, direction];
}
