import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { UserGameTag } from "./user-game-tag.model";
import { MoodTagMeta } from "./mood-tag-meta.model";
import { normalizeTag, normalizeTags } from "./normalize-tag.util";
import * as gamesService from "../games/games.service";
import * as moodTagsServiceError from "./errors/mood-tags.service-error";

const MAX_TAGS_PER_GAME = 10;

export async function replaceTags(
	userId: string,
	gameId: string,
	rawTags: readonly string[]
) {
	const game = await gamesService.findGameById(gameId);
	if (!game) throw moodTagsServiceError.gameNotFoundError();

	const tags = normalizeTags(rawTags);
	if (tags.length > MAX_TAGS_PER_GAME)
		throw moodTagsServiceError.tooManyTagsError(MAX_TAGS_PER_GAME);

	return sequelize.transaction(async transaction => {
		await UserGameTag.destroy({ where: { userId, gameId }, transaction });
		if (tags.length === 0) return [];
		const rows = tags.map(tag => ({ userId, gameId, tag }));
		await UserGameTag.bulkCreate(rows, { transaction });
		return tags;
	});
}

export async function findTagsByGame(userId: string, gameId: string) {
	const rows = await UserGameTag.findAll({
		where: { userId, gameId },
		attributes: ["tag"],
		order: [["tag", "ASC"]]
	});
	return rows.map(r => r.tag);
}

export async function findTagsByUser(userId: string) {
	const rows = (await sequelize.query(
		`SELECT
			COALESCE(ugt."tag", mtm."tag") AS "tag",
			COALESCE(ugt."usageCount", 0) AS "usageCount",
			mtm."description" AS "description"
		FROM (
			SELECT "tag", COUNT(*)::int AS "usageCount"
			FROM "UserGameTags"
			WHERE "userId" = :userId
			GROUP BY "tag"
		) ugt
		FULL OUTER JOIN "MoodTagMetas" mtm
			ON mtm."userId" = :userId AND mtm."tag" = ugt."tag"
		ORDER BY "usageCount" DESC, "tag" ASC`,
		{
			replacements: { userId },
			type: QueryTypes.SELECT
		}
	)) as {
		tag: string;
		usageCount: number;
		description: string | null;
	}[];
	return rows;
}

export async function createTag(
	userId: string,
	rawTag: string,
	description: string | null | undefined
) {
	const tag = normalizeTag(rawTag);
	if (!tag) throw moodTagsServiceError.invalidTagError("empty");
	if (tag.length > 40) throw moodTagsServiceError.invalidTagError("too long");

	const trimmed =
		description === null || description === undefined
			? null
			: description.trim().slice(0, 255) || null;

	const existing = await MoodTagMeta.findOne({ where: { userId, tag } });
	if (existing)
		return { tag, description: existing.description, created: false };

	await MoodTagMeta.create({ userId, tag, description: trimmed });
	return { tag, description: trimmed, created: true };
}

export async function setTagDescription(
	userId: string,
	rawTag: string,
	description: string | null
) {
	const tag = normalizeTag(rawTag);
	if (!tag) throw moodTagsServiceError.invalidTagError("empty");
	if (tag.length > 40) throw moodTagsServiceError.invalidTagError("too long");

	const trimmed =
		description === null || description === undefined
			? null
			: description.trim().slice(0, 255) || null;

	const [meta] = await MoodTagMeta.upsert({
		userId,
		tag,
		description: trimmed
	});
	return meta;
}

export async function renameTag(
	userId: string,
	rawOldTag: string,
	rawNewTag: string
) {
	const oldTag = normalizeTag(rawOldTag);
	const newTag = normalizeTag(rawNewTag);
	if (!oldTag || !newTag) throw moodTagsServiceError.invalidTagError("empty");
	if (newTag.length > 40)
		throw moodTagsServiceError.invalidTagError("too long");
	if (oldTag === newTag) return;

	const exists =
		(await UserGameTag.count({ where: { userId, tag: oldTag } })) > 0 ||
		(await MoodTagMeta.count({ where: { userId, tag: oldTag } })) > 0;
	if (!exists) throw moodTagsServiceError.tagNotFoundError();

	await sequelize.transaction(async transaction => {
		await sequelize.query(
			`INSERT INTO "UserGameTags" ("userId", "gameId", "tag", "createdAt")
			SELECT "userId", "gameId", :newTag, now()
			FROM "UserGameTags"
			WHERE "userId" = :userId AND "tag" = :oldTag
			ON CONFLICT ("userId", "gameId", "tag") DO NOTHING`,
			{
				replacements: { userId, oldTag, newTag },
				transaction
			}
		);
		await UserGameTag.destroy({
			where: { userId, tag: oldTag },
			transaction
		});

		const existingMeta = await MoodTagMeta.findOne({
			where: { userId, tag: oldTag },
			transaction
		});
		const targetMeta = await MoodTagMeta.findOne({
			where: { userId, tag: newTag },
			transaction
		});
		if (existingMeta) {
			if (targetMeta) {
				if (!targetMeta.description && existingMeta.description) {
					await targetMeta.update(
						{ description: existingMeta.description },
						{ transaction }
					);
				}
				await existingMeta.destroy({ transaction });
			} else {
				await existingMeta.update({ tag: newTag }, { transaction });
			}
		}
	});
}

export async function deleteTag(userId: string, rawTag: string) {
	const tag = normalizeTag(rawTag);
	if (!tag) throw moodTagsServiceError.invalidTagError("empty");

	const usageCount = await UserGameTag.count({ where: { userId, tag } });
	const metaCount = await MoodTagMeta.count({ where: { userId, tag } });
	if (usageCount === 0 && metaCount === 0)
		throw moodTagsServiceError.tagNotFoundError();

	await sequelize.transaction(async transaction => {
		await UserGameTag.destroy({ where: { userId, tag }, transaction });
		await MoodTagMeta.destroy({ where: { userId, tag }, transaction });
	});
}

export async function findGameIdsByTags(
	userId: string,
	tags: readonly string[]
): Promise<string[]> {
	const normalized = normalizeTags(tags);
	if (normalized.length === 0) return [];

	const rows = (await sequelize.query(
		`SELECT "gameId" FROM "UserGameTags"
		WHERE "userId" = :userId AND "tag" IN (:tags)
		GROUP BY "gameId"
		HAVING COUNT(DISTINCT "tag") = :tagCount`,
		{
			replacements: {
				userId,
				tags: normalized,
				tagCount: normalized.length
			},
			type: QueryTypes.SELECT
		}
	)) as { gameId: string }[];

	return rows.map(r => r.gameId);
}

export async function findTagsForGames(
	userId: string,
	gameIds: readonly string[]
): Promise<Map<string, string[]>> {
	if (gameIds.length === 0) return new Map();
	const rows = await UserGameTag.findAll({
		where: { userId, gameId: { [Op.in]: [...gameIds] } },
		attributes: ["gameId", "tag"],
		order: [["tag", "ASC"]],
		raw: true
	});
	const map = new Map<string, string[]>();
	for (const row of rows) {
		const arr = map.get(row.gameId) ?? [];
		arr.push(row.tag);
		map.set(row.gameId, arr);
	}
	return map;
}
