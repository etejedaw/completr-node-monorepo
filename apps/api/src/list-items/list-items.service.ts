import {
	col,
	fn,
	type IncludeOptions,
	type OrderItem,
	type Transaction
} from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { acquireAdvisoryLock } from "../common/utils/acquire-advisory-lock.util";
import { acquireAdvisoryLocks } from "../common/utils/acquire-advisory-locks.util";
import { compactPositions as compactPositionsOf } from "../common/utils/compact-positions.util";
import { sequelize } from "../database/sequelize.database";
import * as gameScoresService from "../game-scores/game-scores.service";
import { type TimeSource } from "../game-times/game-time.model";
import * as gameTimesService from "../game-times/game-times.service";
import { Game } from "../games/game.model";
import * as gamesService from "../games/games.service";
import * as gamesProfileService from "../games/services/games-profile.service";
import { List } from "../lists/list.model";
import { FREE_LIST_LIMIT } from "../lists/lists.constants";
import * as listsService from "../lists/lists.service";
import { resolvePremiumAccess } from "../premium-access/services/premium-access.service";
import * as scoreSourcesService from "../score-sources/score-sources.service";
import * as listItemsServiceError from "./errors/list-items.service-error";
import { ListItem } from "./list-item.model";
import {
	type CopiedListItem,
	type FrozenScoreContext
} from "./list-items.types";

const RATING_SCALE = 5;
const SCORE_DECIMAL_FACTOR = 100;

async function checkFrozen(userId: string, role: string) {
	const premiumAccess = await resolvePremiumAccess(
		{ id: userId, role },
		"lists.unlimited"
	);
	if (premiumAccess.allowed) return;
	const total = await listsService.countListsByUserId(userId);
	if (total > FREE_LIST_LIMIT) throw listItemsServiceError.frozenError();
}

async function findOwnedList(listId: string, user: RequestUser) {
	const list = await listsService.findListBasicById(listId);
	if (!list || list.userId !== user.id)
		throw listItemsServiceError.listNotFoundError();
	return list;
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

async function loadFrozenScoreContextsForGame(
	lists: List[],
	gameId: string
): Promise<Map<string, FrozenScoreContext>> {
	const scoreSourceCodes = [...new Set(lists.map(list => list.scoreSource))];
	const durationSources = [
		...new Set(lists.map(list => list.durationSource as TimeSource))
	];
	const [scores, times, scoreSources] = await Promise.all([
		gameScoresService.findScoresByGameIdAndSources(
			gameId,
			scoreSourceCodes
		),
		gameTimesService.findTimesByGameIdAndSources(gameId, durationSources),
		scoreSourcesService.findByCodes(scoreSourceCodes)
	]);
	const scoreBySource = new Map(scores.map(score => [score.source, score]));
	const timeBySource = new Map(times.map(time => [time.source, time]));
	const scoreSourceByCode = new Map(
		scoreSources.map(scoreSource => [scoreSource.code, scoreSource])
	);

	return new Map(
		lists.map(list => {
			const score = scoreBySource.get(list.scoreSource);
			const time = timeBySource.get(list.durationSource as TimeSource);
			return [
				list.id,
				{
					scoresByGameId: new Map(score ? [[gameId, score]] : []),
					timesByGameId: new Map(time ? [[gameId, time]] : []),
					scoreSource: scoreSourceByCode.get(list.scoreSource) ?? null
				}
			];
		})
	);
}

function freezeScoresFromContext(gameId: string, ctx: FrozenScoreContext) {
	const gameScore = ctx.scoresByGameId.get(gameId);
	const gameTime = ctx.timesByGameId.get(gameId);
	const { scoreSource } = ctx;

	const normalizedScore =
		gameScore && scoreSource && scoreSource.scale !== RATING_SCALE
			? Math.round(
					(gameScore.score / scoreSource.scale) *
						RATING_SCALE *
						SCORE_DECIMAL_FACTOR
				) / SCORE_DECIMAL_FACTOR
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

function wrapListItemWrite<T>(write: () => Promise<T>) {
	return write().catch(error =>
		rethrowSequelizeError(error, {
			unique: listItemsServiceError.uniqueConstraintError,
			validation: listItemsServiceError.validationError
		})
	);
}

export async function replaceItems(
	listId: string,
	user: RequestUser,
	gameIds: string[]
) {
	const list = await findOwnedList(listId, user);
	await checkFrozen(user.id, user.role);

	if (gameIds.length === 0) {
		await sequelize.transaction(async (transaction: Transaction) => {
			await lockListItems(listId, transaction);
			await ListItem.destroy({ where: { listId }, transaction });
		});
		return [];
	}

	const games = await gamesService.findGamesByIds(gameIds);
	if (games.length !== gameIds.length) {
		const foundIds = new Set(games.map(game => game.id));
		const missing = gameIds.filter(id => !foundIds.has(id));
		throw listItemsServiceError.gamesNotFoundError(missing);
	}

	const newGameIds = new Set(gameIds);
	const gameIdOrder = new Map(gameIds.map((id, index) => [id, index + 1]));
	const ctx = await loadFrozenScoreContext(list, gameIds);

	await wrapListItemWrite(() =>
		sequelize.transaction(async (transaction: Transaction) => {
			await lockListItems(listId, transaction);

			const existingItems = await ListItem.findAll({
				where: { listId },
				transaction
			});
			const existingByGameId = new Map(
				existingItems.map(item => [item.gameId, item])
			);
			const toDelete = existingItems.filter(
				item => !newGameIds.has(item.gameId)
			);
			const toCreate = gameIds.filter(
				gameId => !existingByGameId.has(gameId)
			);

			if (toDelete.length > 0) {
				await ListItem.destroy({
					where: { id: toDelete.map(item => item.id) },
					transaction
				});
			}

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
		})
	);

	return ListItem.findAll({
		where: { listId },
		include: [{ model: Game }],
		order: [
			["position", "ASC"],
			["id", "ASC"]
		]
	});
}

export async function addItem(
	listId: string,
	user: RequestUser,
	gameId: string
) {
	const list = await findOwnedList(listId, user);
	await checkFrozen(user.id, user.role);

	const alreadyInList = await ListItem.findOne({ where: { listId, gameId } });
	if (alreadyInList) return alreadyInList;

	const games = await gamesService.findGamesByIds([gameId]);
	if (games.length === 0)
		throw listItemsServiceError.gamesNotFoundError([gameId]);

	const ctx = await loadFrozenScoreContext(list, [gameId]);
	const { score, duration } = freezeScoresFromContext(gameId, ctx);

	try {
		return await sequelize.transaction(async transaction => {
			await lockListItems(listId, transaction);

			const existing = await ListItem.findOne({
				where: { listId, gameId },
				transaction
			});
			if (existing) return existing;

			const max = (await ListItem.max("position", {
				where: { listId },
				transaction
			})) as number | null;

			return ListItem.create(
				{ listId, gameId, position: (max ?? 0) + 1, score, duration },
				{ transaction }
			);
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: listItemsServiceError.uniqueConstraintError,
			validation: listItemsServiceError.validationError
		});
	}
}

function listItemsLockKey(listId: string) {
	return `list-items:${listId}`;
}

async function lockListItems(listId: string, transaction: Transaction) {
	await acquireAdvisoryLock(listItemsLockKey(listId), transaction);
}

async function compactPositionsInLists(
	listIds: string[],
	transaction: Transaction
) {
	await compactPositionsOf({
		table: "ListItems",
		ownerColumn: "listId",
		ownerIds: listIds,
		transaction
	});
}

async function compactPositions(listId: string, transaction: Transaction) {
	await compactPositionsOf({
		table: "ListItems",
		ownerColumn: "listId",
		ownerIds: [listId],
		transaction
	});
}

async function findMaxPositionsByListId(
	listIds: string[],
	transaction: Transaction
) {
	const rows = (await ListItem.findAll({
		attributes: ["listId", [fn("MAX", col("position")), "maxPosition"]],
		where: { listId: listIds },
		group: ["listId"],
		raw: true,
		transaction
	})) as unknown as { listId: string; maxPosition: number }[];
	return new Map(rows.map(row => [row.listId, row.maxPosition]));
}

export async function removeItem(
	listId: string,
	user: RequestUser,
	gameId: string
) {
	await findOwnedList(listId, user);

	await sequelize.transaction(async (transaction: Transaction) => {
		await lockListItems(listId, transaction);
		const removedCount = await ListItem.destroy({
			where: { listId, gameId },
			transaction
		});
		if (removedCount > 0) await compactPositions(listId, transaction);
	});
}

async function loadOwnedLists(listIds: string[], ownedListIds: Set<string>) {
	const lists = await listsService.findListsByIds(listIds);
	const listById = new Map(lists.map(list => [list.id, list]));
	return listIds.map(listId => {
		const list = listById.get(listId);
		if (!list || !ownedListIds.has(list.id))
			throw listItemsServiceError.listNotFoundError();
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

	const hasListsToAdd = requestedLists.some(
		list => !containingListIds.has(list.id)
	);
	if (hasListsToAdd) await checkFrozen(user.id, user.role);

	const frozenContexts = await loadFrozenScoreContextsForGame(
		requestedLists,
		gameId
	);
	const lockOrder = [...ownedListIds].sort();

	await wrapListItemWrite(() =>
		sequelize.transaction(async (transaction: Transaction) => {
			await acquireAdvisoryLocks(
				lockOrder.map(ownedListId => listItemsLockKey(ownedListId)),
				transaction
			);

			const currentItems = await ListItem.findAll({
				where: { gameId, listId: lockOrder },
				attributes: ["listId"],
				transaction
			});
			const currentContainingIds = new Set(
				currentItems.map(item => item.listId)
			);
			const listsToAdd = requestedLists.filter(
				list => !currentContainingIds.has(list.id)
			);
			const listIdsToRemove = [...currentContainingIds].filter(
				listId => !requestedListIds.has(listId)
			);

			if (listsToAdd.length > 0) {
				const maxPositions = await findMaxPositionsByListId(
					listsToAdd.map(list => list.id),
					transaction
				);
				await ListItem.bulkCreate(
					listsToAdd.map(list => ({
						listId: list.id,
						gameId,
						position: (maxPositions.get(list.id) ?? 0) + 1,
						...freezeScoresFromContext(
							gameId,
							frozenContexts.get(list.id)!
						)
					})),
					{ transaction }
				);
			}

			if (listIdsToRemove.length > 0) {
				await ListItem.destroy({
					where: { gameId, listId: listIdsToRemove },
					transaction
				});
				await compactPositionsInLists(listIdsToRemove, transaction);
			}
		})
	);

	return gamesProfileService.getListsForGame(user.id, gameId);
}

export async function refreshScores(listId: string, user: RequestUser) {
	const list = await findOwnedList(listId, user);
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

export async function findGameIdsByListId(listId: string) {
	const items = await ListItem.findAll({
		where: { listId },
		attributes: ["gameId"]
	});
	return items.map(item => item.gameId);
}

export async function copyItemsToList(
	listId: string,
	items: CopiedListItem[],
	transaction: Transaction
) {
	if (items.length === 0) return;
	await ListItem.bulkCreate(
		items.map(item => ({
			listId,
			gameId: item.gameId,
			position: item.position,
			score: item.score,
			duration: item.duration
		})),
		{ transaction }
	);
}

export async function findListIdsContainingGameOwnedBy(
	gameId: string,
	userId: string
) {
	const rows = (await ListItem.findAll({
		where: { gameId },
		attributes: ["listId"],
		include: [
			{
				model: List,
				where: { userId },
				attributes: []
			}
		],
		raw: true
	})) as unknown as { listId: string }[];
	return rows.map(row => row.listId);
}

export async function existsByGameId(
	gameId: string,
	transaction?: Transaction
) {
	return (
		(await ListItem.findOne({
			where: { gameId: gameId },
			attributes: ["id"],
			transaction
		})) !== null
	);
}

export function listItemInclude(
	options: Omit<IncludeOptions, "model"> = {}
): IncludeOptions {
	return { model: ListItem, ...options };
}

export function listItemOrder(
	column: "position" | "id",
	direction: "ASC" | "DESC"
): OrderItem {
	return [ListItem, column, direction];
}
