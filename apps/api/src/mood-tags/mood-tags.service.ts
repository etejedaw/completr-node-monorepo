import { Op, QueryTypes, type Transaction } from "sequelize";

import { CHRONOLOGICAL_ORDER } from "../common/constants/chronological-order.constants";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { acquireAdvisoryLock } from "../common/utils/acquire-advisory-lock.util";
import { buildTextSearchSqlCondition } from "../common/utils/text-search.util";
import { sequelize } from "../database/sequelize.database";
import * as gamesService from "../games/games.service";
import { resolvePremiumAccess } from "../premium-access/services/premium-access.service";
import * as moodTagsServiceError from "./errors/mood-tags.service-error";
import { MoodTagMeta } from "./mood-tag-meta.model";
import {
	COMMUNITY_TAG_MIN_PLAYERS,
	FREE_TAG_LIMIT,
	GAME_COMMUNITY_TAGS_LIMIT,
	MAX_FAVORITE_TAGS,
	MAX_TAG_DESCRIPTION_LENGTH,
	MAX_TAG_LENGTH,
	MAX_TAGS_PER_GAME
} from "./mood-tags.constants";
import {
	type CommunityTagStatsRow,
	type GameCommunityTagRow,
	type PublicTaggedGameRow,
	type TagDetails,
	type TaggedGamesPage,
	type TotalRow,
	type UserTagRow
} from "./mood-tags.interface";
import { normalizeTag, normalizeTags } from "./normalize-tag.util";
import { type TagGamesQuery } from "./schemas/tag-games-query.schema";
import { UserGameTag } from "./user-game-tag.model";

const COMMUNITY_VOTES_FROM = `"UserGameTags" AS "vote"
	JOIN "Users" AS "voter" ON "voter"."id" = "vote"."userId" AND "voter"."isActive" = true`;
const ACTIVE_VOTED_GAME_JOIN = `JOIN "Games" AS "votedGame" ON "votedGame"."id" = "vote"."gameId" AND "votedGame"."isActive" = true`;

async function lockUserTags(userId: string, transaction: Transaction) {
	await acquireAdvisoryLock(`mood-tags:${userId}`, transaction);
}

function normalizeValidTag(rawTag: string) {
	const tag = normalizeTag(rawTag);
	if (!tag) throw moodTagsServiceError.invalidTagError("empty");
	if (tag.length > MAX_TAG_LENGTH)
		throw moodTagsServiceError.invalidTagError("too long");
	return tag;
}

function normalizeDescription(description: string | null | undefined) {
	if (description === null || description === undefined) return null;
	return description.trim().slice(0, MAX_TAG_DESCRIPTION_LENGTH) || null;
}

function definedTagDetails(details: TagDetails) {
	return {
		...(details.description !== undefined && {
			description: normalizeDescription(details.description)
		}),
		...(details.icon !== undefined && { icon: details.icon }),
		...(details.color !== undefined && { color: details.color })
	};
}

async function findTagNamesByUser(userId: string, transaction?: Transaction) {
	const rows = (await sequelize.query(
		`SELECT "tag" FROM "UserGameTags" WHERE "userId" = :userId
		UNION
		SELECT "tag" FROM "MoodTagMetas" WHERE "userId" = :userId`,
		{ replacements: { userId }, type: QueryTypes.SELECT, transaction }
	)) as { tag: string }[];
	return new Set(rows.map(row => row.tag));
}

async function assertWithinTagLimit(
	user: RequestUser,
	tags: readonly string[],
	transaction?: Transaction,
	knownUnlimited?: boolean
) {
	const unlimited =
		knownUnlimited ??
		(await resolvePremiumAccess(user, "mood-tags.unlimited")).allowed;
	if (unlimited) return;
	if (transaction) await lockUserTags(user.id, transaction);
	const existing = await findTagNamesByUser(user.id, transaction);
	const newTags = tags.filter(tag => !existing.has(tag));
	if (newTags.length > 0 && existing.size + newTags.length > FREE_TAG_LIMIT)
		throw moodTagsServiceError.limitReachedError(FREE_TAG_LIMIT);
}

async function writeGameTags(
	userId: string,
	gameId: string,
	tags: string[],
	transaction: Transaction
) {
	await UserGameTag.destroy({ where: { userId, gameId }, transaction });
	if (tags.length === 0) return [];
	const rows = tags.map(tag => ({ userId, gameId, tag }));
	await UserGameTag.bulkCreate(rows, { transaction });
	return tags;
}

export async function replaceTags(
	user: RequestUser,
	gameId: string,
	rawTags: readonly string[],
	transaction?: Transaction
) {
	const userId = user.id;
	const game = await gamesService.findGameById(gameId);
	if (!game) throw moodTagsServiceError.gameNotFoundError();

	const tags = normalizeTags(rawTags);
	if (tags.length > MAX_TAGS_PER_GAME)
		throw moodTagsServiceError.tooManyTagsError(MAX_TAGS_PER_GAME);

	const unlimited = await resolveUnlimitedTags(user);
	const replaceUnderLock = async (activeTransaction: Transaction) => {
		await assertWithinTagLimit(user, tags, activeTransaction, unlimited);
		return writeGameTags(userId, gameId, tags, activeTransaction);
	};
	if (transaction) return replaceUnderLock(transaction);
	return sequelize.transaction(replaceUnderLock);
}

export async function findTagsByGame(userId: string, gameId: string) {
	const rows = await UserGameTag.findAll({
		where: { userId, gameId },
		attributes: ["tag"],
		order: [
			["tag", "ASC"],
			["id", "ASC"]
		]
	});
	return rows.map(r => r.tag);
}

export async function findTagsByUser(userId: string) {
	return sequelize.query<UserTagRow>(
		`WITH ugt AS (
			SELECT "tag", COUNT(*)::int AS "usageCount"
			FROM "UserGameTags"
			WHERE "userId" = :userId
			GROUP BY "tag"
		),
		mtm AS (
			SELECT "tag", "description", "favoriteOrder", "icon", "color"
			FROM "MoodTagMetas"
			WHERE "userId" = :userId
		)
		SELECT
			COALESCE(ugt."tag", mtm."tag") AS "tag",
			COALESCE(ugt."usageCount", 0) AS "usageCount",
			mtm."description" AS "description",
			mtm."favoriteOrder" AS "favoriteOrder",
			mtm."icon" AS "icon",
			mtm."color" AS "color"
		FROM ugt
		FULL OUTER JOIN mtm ON mtm."tag" = ugt."tag"
		ORDER BY "usageCount" DESC, "tag" ASC`,
		{
			replacements: { userId },
			type: QueryTypes.SELECT
		}
	);
}

async function resolveUnlimitedTags(user: RequestUser) {
	const { allowed } = await resolvePremiumAccess(user, "mood-tags.unlimited");
	return allowed;
}

export async function createTag(
	user: RequestUser,
	rawTag: string,
	details: TagDetails
) {
	const userId = user.id;
	const tag = normalizeValidTag(rawTag);
	const newTagDetails = {
		description: normalizeDescription(details.description),
		icon: details.icon ?? null,
		color: details.color ?? null
	};
	const unlimited = await resolveUnlimitedTags(user);

	return sequelize.transaction(async transaction => {
		await lockUserTags(userId, transaction);
		const existing = await MoodTagMeta.findOne({
			where: { userId, tag },
			transaction
		});
		if (existing)
			return {
				tag,
				description: existing.description,
				icon: existing.icon,
				color: existing.color,
				created: false
			};

		await assertWithinTagLimit(user, [tag], transaction, unlimited);

		await MoodTagMeta.create(
			{ userId, tag, ...newTagDetails },
			{ transaction }
		);
		return { tag, ...newTagDetails, created: true };
	});
}

export async function updateTagDetails(
	user: RequestUser,
	rawTag: string,
	details: TagDetails
) {
	const userId = user.id;
	const tag = normalizeValidTag(rawTag);
	const changedDetails = definedTagDetails(details);
	const unlimited = await resolveUnlimitedTags(user);

	return sequelize.transaction(async transaction => {
		await lockUserTags(userId, transaction);
		await assertWithinTagLimit(user, [tag], transaction, unlimited);

		const [meta] = await MoodTagMeta.upsert(
			{ userId, tag, ...changedDetails },
			{ transaction }
		);
		return meta;
	});
}

export async function renameTag(
	userId: string,
	rawOldTag: string,
	rawNewTag: string
) {
	const oldTag = normalizeTag(rawOldTag);
	const newTag = normalizeTag(rawNewTag);
	if (!oldTag || !newTag) throw moodTagsServiceError.invalidTagError("empty");
	if (newTag.length > MAX_TAG_LENGTH)
		throw moodTagsServiceError.invalidTagError("too long");
	if (oldTag === newTag) return;

	const exists =
		(await UserGameTag.count({ where: { userId, tag: oldTag } })) > 0 ||
		(await MoodTagMeta.count({ where: { userId, tag: oldTag } })) > 0;
	if (!exists) throw moodTagsServiceError.tagNotFoundError();

	await sequelize.transaction(async transaction => {
		await lockUserTags(userId, transaction);
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
				await targetMeta.update(
					{
						description:
							targetMeta.description || existingMeta.description,
						icon: targetMeta.icon ?? existingMeta.icon,
						color: targetMeta.color ?? existingMeta.color,
						favoriteOrder: earliestFavoriteOrder(
							targetMeta.favoriteOrder,
							existingMeta.favoriteOrder
						)
					},
					{ transaction }
				);
				await existingMeta.destroy({ transaction });
				await compactFavoriteOrder(userId, transaction);
			} else {
				await existingMeta.update({ tag: newTag }, { transaction });
			}
		}
	});
}

function earliestFavoriteOrder(...orders: (number | null)[]) {
	const favorites = orders.filter(order => typeof order === "number");
	return favorites.length > 0 ? Math.min(...favorites) : null;
}

async function compactFavoriteOrder(userId: string, transaction: Transaction) {
	await sequelize.query(
		`UPDATE "MoodTagMetas" AS "meta"
		SET "favoriteOrder" = "ranked"."position" - 1
		FROM (
			SELECT "id", ROW_NUMBER() OVER (ORDER BY "favoriteOrder" ASC, "id" ASC) AS "position"
			FROM "MoodTagMetas"
			WHERE "userId" = :userId AND "favoriteOrder" IS NOT NULL
		) AS "ranked"
		WHERE "meta"."id" = "ranked"."id"
			AND "meta"."favoriteOrder" <> "ranked"."position" - 1`,
		{ replacements: { userId }, transaction }
	);
}

export async function deleteTag(userId: string, rawTag: string) {
	const tag = normalizeTag(rawTag);
	if (!tag) throw moodTagsServiceError.invalidTagError("empty");

	const usageCount = await UserGameTag.count({ where: { userId, tag } });
	const metaCount = await MoodTagMeta.count({ where: { userId, tag } });
	if (usageCount === 0 && metaCount === 0)
		throw moodTagsServiceError.tagNotFoundError();

	await sequelize.transaction(async transaction => {
		await lockUserTags(userId, transaction);
		await UserGameTag.destroy({ where: { userId, tag }, transaction });
		await MoodTagMeta.destroy({ where: { userId, tag }, transaction });
		await compactFavoriteOrder(userId, transaction);
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
		order: [
			["tag", "ASC"],
			["id", "ASC"]
		],
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

export async function existsByGameId(
	gameId: string,
	transaction?: Transaction
) {
	return (
		(await UserGameTag.findOne({
			where: { gameId: gameId },
			attributes: ["id"],
			transaction
		})) !== null
	);
}

export async function findGameTagsForDataExport(userId: string) {
	return UserGameTag.findAll({
		where: { userId },
		attributes: ["gameId", "tag", "createdAt"],
		order: CHRONOLOGICAL_ORDER
	});
}

export async function findTagMetasForDataExport(userId: string) {
	return MoodTagMeta.findAll({
		where: { userId },
		order: CHRONOLOGICAL_ORDER
	});
}

export async function replaceFavoriteTags(
	userId: string,
	rawTags: readonly string[]
) {
	if (rawTags.length > MAX_FAVORITE_TAGS)
		throw moodTagsServiceError.tooManyFavoritesError(MAX_FAVORITE_TAGS);
	const tags = rawTags.map(normalizeValidTag);
	const duplicated = tags.find((tag, index) => tags.indexOf(tag) !== index);
	if (duplicated !== undefined)
		throw moodTagsServiceError.duplicatedFavoriteError(duplicated);

	return sequelize.transaction(async transaction => {
		await lockUserTags(userId, transaction);
		const owned = await findTagNamesByUser(userId, transaction);
		const unknown = tags.filter(tag => !owned.has(tag));
		if (unknown.length > 0)
			throw moodTagsServiceError.unknownFavoriteTagError(unknown);

		await MoodTagMeta.update(
			{ favoriteOrder: null },
			{
				where: { userId, favoriteOrder: { [Op.ne]: null } },
				transaction
			}
		);
		if (tags.length > 0)
			await sequelize.query(
				`INSERT INTO "MoodTagMetas" ("userId", "tag", "favoriteOrder", "createdAt", "updatedAt")
				SELECT :userId, "favorite"."tag", "favorite"."position" - 1, now(), now()
				FROM unnest(ARRAY[:tags]::varchar[]) WITH ORDINALITY AS "favorite"("tag", "position")
				ON CONFLICT ("userId", "tag")
				DO UPDATE SET "favoriteOrder" = EXCLUDED."favoriteOrder", "updatedAt" = now()`,
				{ replacements: { userId, tags }, transaction }
			);
		return tags;
	});
}

export async function findFavoriteTagsByUser(userId: string) {
	return MoodTagMeta.findAll({
		where: { userId, favoriteOrder: { [Op.ne]: null } },
		attributes: ["tag", "description", "icon", "color"],
		order: [
			["favoriteOrder", "ASC"],
			["id", "ASC"]
		]
	});
}

export async function findGameCommunityTags(
	gameId: string,
	viewerId: string | undefined
) {
	if (!(await gamesService.existsActiveGameById(gameId)))
		throw moodTagsServiceError.gameNotFoundError();

	const rows = await sequelize.query<GameCommunityTagRow>(
		`SELECT "vote"."tag",
			COUNT(DISTINCT "vote"."userId")::int AS "players",
			COALESCE(BOOL_OR("vote"."userId" = :viewerId), false) AS "mine"
		FROM ${COMMUNITY_VOTES_FROM}
		WHERE "vote"."gameId" = :gameId
		GROUP BY "vote"."tag"
		HAVING COUNT(DISTINCT "vote"."userId") >= :minPlayers
			OR COALESCE(BOOL_OR("vote"."userId" = :viewerId), false)
		ORDER BY "players" DESC, "vote"."tag" ASC`,
		{
			replacements: {
				gameId,
				viewerId: viewerId ?? null,
				minPlayers: COMMUNITY_TAG_MIN_PLAYERS
			},
			type: QueryTypes.SELECT
		}
	);

	const publicTags = rows
		.filter(row => row.players >= COMMUNITY_TAG_MIN_PLAYERS)
		.slice(0, GAME_COMMUNITY_TAGS_LIMIT);
	const shownTags = new Set(publicTags.map(row => row.tag));
	const ownHiddenTags = rows.filter(
		row => row.mine && !shownTags.has(row.tag)
	);
	return [...publicTags, ...ownHiddenTags];
}

function communityTagStatsSql(searchCondition: string | null) {
	const searchWhere = searchCondition ? `WHERE ${searchCondition}` : "";
	return `WITH "publicPairs" AS (
			SELECT "vote"."tag", "vote"."gameId"
			FROM ${COMMUNITY_VOTES_FROM}
			${ACTIVE_VOTED_GAME_JOIN}
			${searchWhere}
			GROUP BY "vote"."tag", "vote"."gameId"
			HAVING COUNT(DISTINCT "vote"."userId") >= :minPlayers
		)
		SELECT "publicPairs"."tag",
			COUNT(DISTINCT "publicPairs"."gameId")::int AS "games",
			COUNT(DISTINCT "vote"."userId")::int AS "players"
		FROM "publicPairs"
		JOIN "UserGameTags" AS "vote"
			ON "vote"."tag" = "publicPairs"."tag" AND "vote"."gameId" = "publicPairs"."gameId"
		JOIN "Users" AS "voter" ON "voter"."id" = "vote"."userId" AND "voter"."isActive" = true
		GROUP BY "publicPairs"."tag"
		ORDER BY "games" DESC, "players" DESC, "publicPairs"."tag" ASC
		LIMIT :limit`;
}

async function findCommunityTagStats(
	searchCondition: string | null,
	limit: number
) {
	return sequelize.query<CommunityTagStatsRow>(
		communityTagStatsSql(searchCondition),
		{
			replacements: { minPlayers: COMMUNITY_TAG_MIN_PLAYERS, limit },
			type: QueryTypes.SELECT
		}
	);
}

export async function findPopularCommunityTags(limit: number) {
	return findCommunityTagStats(null, limit);
}

export async function searchCommunityTags(search: string, limit: number) {
	const searchCondition = buildTextSearchSqlCondition(search, "vote.tag");
	if (!searchCondition) return [];
	return findCommunityTagStats(searchCondition, limit);
}

const PUBLIC_TAGGED_GAMES_CTE = `WITH "taggedGames" AS (
		SELECT "vote"."gameId", COUNT(DISTINCT "vote"."userId")::int AS "players"
		FROM ${COMMUNITY_VOTES_FROM}
		${ACTIVE_VOTED_GAME_JOIN}
		WHERE "vote"."tag" = :tag
		GROUP BY "vote"."gameId"
		HAVING COUNT(DISTINCT "vote"."userId") >= :minPlayers
	)`;

export async function findPublicGamesByTag(
	rawTag: string,
	page: TagGamesQuery
): Promise<TaggedGamesPage> {
	const tag = normalizeTag(rawTag);
	if (!tag || tag.length > MAX_TAG_LENGTH)
		return { tag, total: 0, games: [] };

	const replacements = {
		tag,
		minPlayers: COMMUNITY_TAG_MIN_PLAYERS,
		limit: page.limit,
		offset: page.offset
	};
	const [totalRows, rows] = await Promise.all([
		sequelize.query<TotalRow>(
			`${PUBLIC_TAGGED_GAMES_CTE}
			SELECT COUNT(*)::int AS "total" FROM "taggedGames"`,
			{ replacements, type: QueryTypes.SELECT }
		),
		sequelize.query<PublicTaggedGameRow>(
			`${PUBLIC_TAGGED_GAMES_CTE}
			SELECT "taggedGames"."gameId", "taggedGames"."players"
			FROM "taggedGames"
			JOIN "Games" AS "game" ON "game"."id" = "taggedGames"."gameId"
			ORDER BY "taggedGames"."players" DESC, "game"."title" ASC, "game"."id" ASC
			LIMIT :limit OFFSET :offset`,
			{ replacements, type: QueryTypes.SELECT }
		)
	]);

	const games = await gamesService.findActiveGamesWithRatioByIds(
		rows.map(row => row.gameId)
	);
	const gameById = new Map(games.map(game => [game.id, game]));
	return {
		tag,
		total: totalRows[0]?.total ?? 0,
		games: rows.flatMap(row => {
			const game = gameById.get(row.gameId);
			return game ? [{ game, players: row.players }] : [];
		})
	};
}
