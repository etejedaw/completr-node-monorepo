import { Op, literal } from "sequelize";
import { sequelize } from "../../database/sequelize.database";
import { BacklogQuery } from "../schemas/backlog-query.schema";
import {
	buildDateRangeWhere,
	buildRangeWhere
} from "../../common/utils/sequelize-range.util";

export function buildBacklogWhere(
	base: Record<string, unknown>,
	filters: BacklogQuery
) {
	const where: Record<string, unknown> = { ...base };
	const andConditions: object[] = [];

	if (filters.status)
		where.status =
			filters.status.length === 1
				? filters.status[0]
				: { [Op.in]: filters.status };
	if (filters.game_id) where.gameId = filters.game_id;
	if (filters.platform_id) where.platformId = filters.platform_id;

	if (filters.platforms && filters.platforms.length > 0) {
		const escaped = filters.platforms
			.map(p => sequelize.escape(p))
			.join(", ");
		andConditions.push({
			platformId: {
				[Op.in]: literal(
					`(SELECT id FROM "Platforms" WHERE code IN (${escaped}))`
				)
			}
		});
	}

	if (filters.genres && filters.genres.length > 0) {
		const escaped = filters.genres.map(g => sequelize.escape(g)).join(", ");
		andConditions.push({
			gameId: {
				[Op.in]: literal(
					`(SELECT DISTINCT gg."gameId" FROM "GameGenres" gg JOIN "Genres" g ON g.id = gg."genreId" WHERE g.code IN (${escaped}))`
				)
			}
		});
	}

	if (
		filters.release_year_from !== undefined ||
		filters.release_year_to !== undefined
	) {
		const conditions: string[] = [];
		if (filters.release_year_from !== undefined)
			conditions.push(
				`EXTRACT(YEAR FROM g."releaseAt") >= ${filters.release_year_from}`
			);
		if (filters.release_year_to !== undefined)
			conditions.push(
				`EXTRACT(YEAR FROM g."releaseAt") <= ${filters.release_year_to}`
			);
		andConditions.push({
			gameId: {
				[Op.in]: literal(
					`(SELECT g.id FROM "Games" g WHERE ${conditions.join(" AND ")})`
				)
			}
		});
	}

	const startedAt = buildDateRangeWhere(
		filters.started_from,
		filters.started_to
	);
	if (startedAt) where.startedAt = startedAt;

	if (filters.no_finished_date) {
		where.finishedAt = { [Op.is]: null };
	} else {
		const finishedAt = buildDateRangeWhere(
			filters.finished_from,
			filters.finished_to
		);
		if (finishedAt) where.finishedAt = finishedAt;
	}

	const score = buildRangeWhere(filters.min_score, filters.max_score);
	if (score) where.score = score;

	const duration = buildRangeWhere(
		filters.min_duration,
		filters.max_duration
	);
	if (duration) where.duration = duration;

	const realDuration = buildRangeWhere(
		filters.min_real_duration,
		filters.max_real_duration
	);
	if (realDuration) where.realDuration = realDuration;

	const userRating = buildRangeWhere(filters.min_rating, filters.max_rating);
	if (userRating) where.userRating = userRating;

	if (filters.min_ratio !== undefined)
		andConditions.push(
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."duration", 0)) >= ${filters.min_ratio}`
			)
		);
	if (filters.max_ratio !== undefined)
		andConditions.push(
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."duration", 0)) <= ${filters.max_ratio}`
			)
		);
	if (filters.min_personal_ratio !== undefined)
		andConditions.push(
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."realDuration", 0)) >= ${filters.min_personal_ratio}`
			)
		);
	if (filters.max_personal_ratio !== undefined)
		andConditions.push(
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."realDuration", 0)) <= ${filters.max_personal_ratio}`
			)
		);

	if (filters.mood_tags && filters.mood_tags.length > 0) {
		const ownerId = base.userId as string | undefined;
		if (ownerId) {
			const escapedTags = filters.mood_tags
				.map(t => sequelize.escape(t.toLowerCase().trim()))
				.join(", ");
			andConditions.push({
				gameId: {
					[Op.in]: literal(
						`(SELECT "gameId" FROM "UserGameTags" WHERE "userId" = ${sequelize.escape(ownerId)} AND "tag" IN (${escapedTags}) GROUP BY "gameId" HAVING COUNT(DISTINCT "tag") = ${filters.mood_tags.length})`
					)
				}
			});
		}
	}

	if (andConditions.length > 0)
		where[Op.and as unknown as string] = andConditions;

	return where;
}
