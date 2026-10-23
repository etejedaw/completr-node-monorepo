import { Op, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { sequelize } from "../database/sequelize.database";
import { type GameScore } from "../game-scores/game-score.model";
import * as gameScoresService from "../game-scores/game-scores.service";
import { type GameTime } from "../game-times/game-time.model";
import { type TimeSource } from "../game-times/game-time.model";
import * as gameTimesService from "../game-times/game-times.service";
import { Game } from "../games/game.model";
import * as gamesService from "../games/games.service";
import * as gamesProfileService from "../games/services/games-profile.service";
import { List } from "../lists/list.model";
import * as listsService from "../lists/lists.service";
import { type ScoreSource } from "../score-sources/score-source.model";
import * as scoreSourcesService from "../score-sources/score-sources.service";
import * as listItemsServiceError from "./errors/list-items.service-error";
import { ListItem } from "./list-item.model";

const FREE_OWNED_LISTS_LIMIT = 5;

type FrozenScoreContext = {
	scoresByGameId: Map<string, GameScore>;
	timesByGameId: Map<string, GameTime>;
	scoreSource: ScoreSource | null;
};

function isPremium(role: string) {
	return role === "premium" || role === "moderator" || role === "admin";
}

async function checkFrozen(userId: string, role: string) {
	if (isPremium(role)) return;
	const total = await listsService.countListsByUserId(userId);
	if (total > FREE_OWNED_LISTS_LIMIT)
		throw listItemsServiceError.frozenError();
}

async function loadFrozenScoreContext(
	list: List,
	gameIds: string[]
): Promise<FrozenScoreContext> {
	const [scores, times, scoreSource] = await Promise.all([
		gameScoresService.findScoresByGameIdsAndSource(
			gameIds,
			list.scoreSource
		),
		gameTimesService.findTimesByGameIdsAndSource(
			gameIds,
			list.durationSource as TimeSource
		),
		scoreSourcesService.findByCode(list.scoreSource)
	]);

	return {
		scoresByGameId: new Map(scores.map(s => [s.gameId, s])),
		timesByGameId: new Map(times.map(t => [t.gameId, t])),
		scoreSource
	};
}

function freezeScoresFromContext(gameId: string, ctx: FrozenScoreContext) {
	const gameScore = ctx.scoresByGameId.get(gameId);
	const gameTime = ctx.timesByGameId.get(gameId);
	const { scoreSource } = ctx;

	const normalizedScore =
		gameScore && scoreSource && scoreSource.scale !== 5
			? Math.round((gameScore.score / scoreSource.scale) * 5 * 100) / 100
			: (gameScore?.score ?? null);

	return {
		score: normalizedScore,
		duration: gameTime?.duration ?? null
	};
}

async function bulkUpdatePositions(
	rows: { id: string; position: number }[],
	transaction: Transaction
) {
	if (rows.length === 0) return;
	const values = rows.map(() => "(?::uuid, ?::integer)").join(", ");
	await sequelize.query(
		`UPDATE "ListItems" AS li
		SET "position" = v."position", "updatedAt" = NOW()
		FROM (VALUES ${values}) AS v("id", "position")
		WHERE li."id" = v."id"`,
		{
			replacements: rows.flatMap(row => [row.id, row.position]),
			transaction
		}
	);
}

async function bulkUpdateFrozenScores(
	rows: { id: string; score: number | null; duration: number | null }[],
	transaction: Transaction
) {
	if (rows.length === 0) return;
	const values = rows
		.map(() => "(?::uuid, ?::double precision, ?::double precision)")
		.join(", ");
	await sequelize.query(
		`UPDATE "ListItems" AS li
		SET "score" = v."score", "duration" = v."duration", "updatedAt" = NOW()
		FROM (VALUES ${values}) AS v("id", "score", "duration")
		WHERE li."id" = v."id"`,
		{
			replacements: rows.flatMap(row => [
				row.id,
				row.score,
				row.duration
			]),
			transaction
		}
	);
}

export async function replaceItems(
	listId: string,
	user: RequestUser,
	gameIds: string[]
) {
	const list = await listsService.findListBasicById(listId);
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== user.id) throw listItemsServiceError.forbiddenError();
	await checkFrozen(user.id, user.role);

	if (gameIds.length === 0) {
		await ListItem.destroy({ where: { listId } });
		return [];
	}

	const games = await gamesService.findGamesByIds(gameIds);
	if (games.length !== gameIds.length) {
		const foundIds = new Set(games.map(game => game.id));
		const missing = gameIds.filter(id => !foundIds.has(id));
		throw listItemsServiceError.gamesNotFoundError(missing);
	}

	const existingItems = await ListItem.findAll({ where: { listId } });
	const existingByGameId = new Map(
		existingItems.map(item => [item.gameId, item])
	);

	const newGameIds = new Set(gameIds);
	const toDelete = existingItems.filter(item => !newGameIds.has(item.gameId));
	const toCreate = gameIds.filter(gameId => !existingByGameId.has(gameId));
	const gameIdOrder = new Map(gameIds.map((id, index) => [id, index + 1]));

	const ctx = await loadFrozenScoreContext(list, toCreate);

	await sequelize.transaction(async (transaction: Transaction) => {
		if (toDelete.length > 0) {
			await ListItem.destroy({
				where: { id: toDelete.map(item => item.id) },
				transaction
			});
		}

		try {
			if (toCreate.length > 0) {
				const rows = toCreate.map(gameId => {
					const { score, duration } = freezeScoresFromContext(
						gameId,
						ctx
					);
					return {
						listId,
						gameId,
						position: gameIdOrder.get(gameId)!,
						score,
						duration
					};
				});
				await ListItem.bulkCreate(rows, { transaction });
			}

			const movedItems = existingItems
				.filter(item => newGameIds.has(item.gameId))
				.filter(item => item.position !== gameIdOrder.get(item.gameId));
			await bulkUpdatePositions(
				movedItems.map(item => ({
					id: item.id,
					position: gameIdOrder.get(item.gameId)!
				})),
				transaction
			);
		} catch (error) {
			rethrowSequelizeError(error, {
				unique: listItemsServiceError.uniqueConstraintError,
				validation: listItemsServiceError.validationError
			});
		}
	});

	return ListItem.findAll({
		where: { listId },
		include: [{ model: Game }],
		order: [["position", "ASC"]]
	});
}

export async function addItem(
	listId: string,
	user: RequestUser,
	gameId: string
) {
	const list = await listsService.findListBasicById(listId);
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== user.id) throw listItemsServiceError.forbiddenError();
	await checkFrozen(user.id, user.role);

	const existing = await ListItem.findOne({ where: { listId, gameId } });
	if (existing) return existing;

	const games = await gamesService.findGamesByIds([gameId]);
	if (games.length === 0)
		throw listItemsServiceError.gamesNotFoundError([gameId]);

	const max = (await ListItem.max("position", { where: { listId } })) as
		number | null;
	const nextPosition = (max ?? 0) + 1;

	const ctx = await loadFrozenScoreContext(list, [gameId]);
	const { score, duration } = freezeScoresFromContext(gameId, ctx);

	try {
		return await ListItem.create({
			listId,
			gameId,
			position: nextPosition,
			score,
			duration
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: listItemsServiceError.uniqueConstraintError,
			validation: listItemsServiceError.validationError
		});
	}
}

async function compactPositions(listId: string, transaction: Transaction) {
	await sequelize.query(
		`UPDATE "ListItems" AS li
		SET "position" = ranked."position", "updatedAt" = NOW()
		FROM (
			SELECT "id", ROW_NUMBER() OVER (ORDER BY "position", "createdAt", "id") AS "position"
			FROM "ListItems"
			WHERE "listId" = :listId
		) AS ranked
		WHERE li."id" = ranked."id" AND li."position" <> ranked."position"`,
		{ replacements: { listId }, transaction }
	);
}

export async function removeItem(
	listId: string,
	user: RequestUser,
	gameId: string
) {
	const list = await listsService.findListBasicById(listId);
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== user.id) throw listItemsServiceError.forbiddenError();

	await sequelize.transaction(async (transaction: Transaction) => {
		const removedCount = await ListItem.destroy({
			where: { listId, gameId },
			transaction
		});
		if (removedCount > 0) await compactPositions(listId, transaction);
	});
}

async function loadOwnedLists(listIds: string[], ownedListIds: Set<string>) {
	const lists = await List.findAll({
		where: { id: { [Op.in]: listIds } }
	});
	const listById = new Map(lists.map(list => [list.id, list]));
	return listIds.map(listId => {
		const list = listById.get(listId);
		if (!list) throw listItemsServiceError.listNotFoundError();
		if (!ownedListIds.has(list.id))
			throw listItemsServiceError.forbiddenError();
		return list;
	});
}

export async function setGameLists(
	gameId: string,
	user: RequestUser,
	listIds: string[]
) {
	const games = await gamesService.findGamesByIds([gameId]);
	if (games.length === 0)
		throw listItemsServiceError.gamesNotFoundError([gameId]);

	const currentLists = await listsService.findUserListsWithGameFlag(
		user.id,
		gameId
	);
	const ownedListIds = new Set(currentLists.map(list => list.id));
	const containingListIds = new Set(
		currentLists.filter(list => list.contains).map(list => list.id)
	);

	const requestedLists = await loadOwnedLists(listIds, ownedListIds);
	const requestedListIds = new Set(listIds);

	const listsToAdd = requestedLists.filter(
		list => !containingListIds.has(list.id)
	);
	const listIdsToRemove = [...containingListIds].filter(
		listId => !requestedListIds.has(listId)
	);

	if (listsToAdd.length > 0) await checkFrozen(user.id, user.role);

	const frozenContexts = await Promise.all(
		listsToAdd.map(list => loadFrozenScoreContext(list, [gameId]))
	);

	await sequelize.transaction(async (transaction: Transaction) => {
		try {
			for (const [index, list] of listsToAdd.entries()) {
				const max = (await ListItem.max("position", {
					where: { listId: list.id },
					transaction
				})) as number | null;
				const { score, duration } = freezeScoresFromContext(
					gameId,
					frozenContexts[index]!
				);
				await ListItem.create(
					{
						listId: list.id,
						gameId,
						position: (max ?? 0) + 1,
						score,
						duration
					},
					{ transaction }
				);
			}

			for (const listId of listIdsToRemove) {
				const removedCount = await ListItem.destroy({
					where: { listId, gameId },
					transaction
				});
				if (removedCount > 0)
					await compactPositions(listId, transaction);
			}
		} catch (error) {
			rethrowSequelizeError(error, {
				unique: listItemsServiceError.uniqueConstraintError,
				validation: listItemsServiceError.validationError
			});
		}
	});

	return gamesProfileService.getListsForGame(user.id, gameId);
}

export async function refreshScores(listId: string, user: RequestUser) {
	const list = await listsService.findListBasicById(listId);
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== user.id) throw listItemsServiceError.forbiddenError();
	await checkFrozen(user.id, user.role);

	const items = await ListItem.findAll({ where: { listId } });
	if (items.length === 0) return 0;

	const ctx = await loadFrozenScoreContext(
		list,
		items.map(item => item.gameId)
	);

	await sequelize.transaction(async (transaction: Transaction) => {
		await bulkUpdateFrozenScores(
			items.map(item => ({
				id: item.id,
				...freezeScoresFromContext(item.gameId, ctx)
			})),
			transaction
		);
	});

	return items.length;
}
