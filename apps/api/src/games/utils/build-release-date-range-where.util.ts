import { buildRangeWhere } from "../../common/utils/sequelize-range.util";

export function buildReleaseDateRangeWhere(
	from: number | undefined,
	to: number | undefined
): Record<string, unknown> {
	const range = buildRangeWhere(
		from !== undefined ? new Date(`${from}-01-01`) : undefined,
		to !== undefined ? new Date(`${to}-12-31`) : undefined
	);
	return range ? { releaseAt: range } : {};
}
