import { Op, QueryTypes } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import * as gamesService from "../../games/games.service";
import * as platformsService from "../../platforms/platforms.service";
import { BACKLOG_PLATFORM_ATTRS } from "../backlog.constants";
import { Backlog } from "../backlog.model";

const REWIND_GAME_ATTRS = [
	"id",
	"code",
	"title",
	"coverUrl",
	"backgroundUrl",
	"releaseAt"
];

const REWIND_RUN_ATTRS = [
	"id",
	"gameId",
	"status",
	"startedAt",
	"finishedAt",
	"realDuration",
	"duration",
	"score",
	"userRating",
	"createdAt"
];

export async function findDatedRunsByUserId(
	userId: string,
	options: { publicOnly: boolean; includeNotes?: boolean }
) {
	return Backlog.findAll({
		where: {
			userId,
			...(options.publicOnly && { isPublic: true }),
			[Op.or]: [
				{ startedAt: { [Op.ne]: null } },
				{
					status: ["completed", "abandoned"],
					finishedAt: { [Op.ne]: null }
				}
			]
		},
		attributes: options.includeNotes
			? [...REWIND_RUN_ATTRS, "notes"]
			: REWIND_RUN_ATTRS,
		include: [
			{ ...gamesService.gameInclude(), attributes: REWIND_GAME_ATTRS },
			{ ...platformsService.platformInclude(), attributes: BACKLOG_PLATFORM_ATTRS }
		],
		order: [["id", "ASC"]]
	});
}

const MONTHS_IN_YEAR = 12;

export async function countRunsAddedByMonth(
	userId: string,
	year: number,
	visibility: { publicOnly: boolean }
): Promise<number[]> {
	const rows = await sequelize.query<{ month: number; count: number }>(
		`SELECT EXTRACT(MONTH FROM "createdAt" AT TIME ZONE 'UTC')::int AS month,
		        COUNT(*)::int AS count
		 FROM "Backlogs"
		 WHERE "userId" = :userId
		   AND "createdAt" >= make_timestamptz(:year, 1, 1, 0, 0, 0, 'UTC')
		   AND "createdAt" < make_timestamptz(:year + 1, 1, 1, 0, 0, 0, 'UTC')
		   AND ("createdAt" AT TIME ZONE 'UTC')::date <> (
		     SELECT MIN("createdAt" AT TIME ZONE 'UTC')::date
		     FROM "Backlogs"
		     WHERE "userId" = :userId
		   )
		   ${visibility.publicOnly ? `AND "isPublic" = true` : ""}
		 GROUP BY month`,
		{ replacements: { userId, year }, type: QueryTypes.SELECT }
	);

	const counts = Array.from({ length: MONTHS_IN_YEAR }, () => 0);
	for (const row of rows) counts[row.month - 1] = row.count;
	return counts;
}
