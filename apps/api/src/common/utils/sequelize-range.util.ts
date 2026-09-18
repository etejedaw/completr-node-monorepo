import { Op } from "sequelize";

export type RangeWhere<T> = { [Op.gte]?: T; [Op.lte]?: T };

export function buildRangeWhere<T>(
	min: T | undefined,
	max: T | undefined
): RangeWhere<T> | undefined {
	if (min === undefined && max === undefined) return undefined;
	const filter: RangeWhere<T> = {};
	if (min !== undefined) filter[Op.gte] = min;
	if (max !== undefined) filter[Op.lte] = max;
	return filter;
}

export function buildDateRangeWhere(
	from: string | undefined,
	to: string | undefined
): RangeWhere<Date> | undefined {
	return buildRangeWhere(
		from ? new Date(from) : undefined,
		to ? new Date(to) : undefined
	);
}
