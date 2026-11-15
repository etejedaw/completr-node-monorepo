import { Op } from "sequelize";

import { sequelize } from "../../database/sequelize.database";

export function buildGenreCondition(
	codes: readonly string[] | undefined
): object | null {
	if (!codes || codes.length === 0) return null;
	const escaped = codes.map(code => sequelize.escape(code)).join(", ");
	return {
		id: {
			[Op.in]: sequelize.literal(
				`(SELECT DISTINCT gg."gameId" FROM "GameGenres" gg JOIN "Genres" g ON g.id = gg."genreId" WHERE g.code IN (${escaped}))`
			)
		}
	};
}
