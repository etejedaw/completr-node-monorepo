import { Transaction } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { ListItem } from "./list-item.model";
import { List } from "../lists/list.model";
import { Game } from "../games/game.model";
import { GameScore } from "../game-scores/game-score.model";
import { GameTime } from "../game-times/game-time.model";
import { ScoreSource } from "../score-sources/score-source.model";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as listItemsServiceError from "./errors/list-items.service-error";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";

const FREE_LIST_LIMIT = 5;

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
	const count = await List.count({ where: { userId } });
	if (count > FREE_LIST_LIMIT) throw listItemsServiceError.frozenError();
}

async function loadFrozenScoreContext(
	list: List,
	gameIds: string[]
): Promise<FrozenScoreContext> {
	const [scores, times, scoreSource] = await Promise.all([
		gameIds.length === 0
			? Promise.resolve([] as GameScore[])
			: GameScore.findAll({
					where: { gameId: gameIds, source: list.scoreSource }
				}),
		gameIds.length === 0
			? Promise.resolve([] as GameTime[])
			: GameTime.findAll({
					where: { gameId: gameIds, source: list.durationSource }
				}),
		ScoreSource.findOne({ where: { code: list.scoreSource } })
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

export async function replaceItems(
	listId: string,
	user: RequestUser,
	gameIds: string[]
) {
	const list = await List.findOne({ where: { id: listId } });
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== user.id) throw listItemsServiceError.forbiddenError();
	await checkFrozen(user.id, user.role);

	if (gameIds.length === 0) {
		await ListItem.destroy({ where: { listId } });
		return [];
	}

	const games = await Game.findAll({ where: { id: gameIds } });
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
			try {
				await ListItem.bulkCreate(rows, { transaction });
			} catch (error) {
				rethrowSequelizeError(error, {
					unique: listItemsServiceError.uniqueConstraintError,
					validation: listItemsServiceError.validationError
				});
			}
		}

		const positionUpdates = existingItems
			.filter(item => newGameIds.has(item.gameId))
			.filter(item => item.position !== gameIdOrder.get(item.gameId))
			.map(item =>
				item.update(
					{ position: gameIdOrder.get(item.gameId)! },
					{ transaction }
				)
			);
		await Promise.all(positionUpdates);
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
	const list = await List.findOne({ where: { id: listId } });
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== user.id) throw listItemsServiceError.forbiddenError();
	await checkFrozen(user.id, user.role);

	const existing = await ListItem.findOne({ where: { listId, gameId } });
	if (existing) return existing;

	const game = await Game.findOne({ where: { id: gameId } });
	if (!game) throw listItemsServiceError.gamesNotFoundError([gameId]);

	const max = (await ListItem.max("position", { where: { listId } })) as
		| number
		| null;
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

export async function removeItem(
	listId: string,
	user: RequestUser,
	gameId: string
) {
	const list = await List.findOne({ where: { id: listId } });
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== user.id) throw listItemsServiceError.forbiddenError();

	await ListItem.destroy({ where: { listId, gameId } });
}

export async function refreshScores(listId: string, user: RequestUser) {
	const list = await List.findOne({ where: { id: listId } });
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
		await Promise.all(
			items.map(item => {
				const { score, duration } = freezeScoresFromContext(
					item.gameId,
					ctx
				);
				return item.update({ score, duration }, { transaction });
			})
		);
	});

	return items.length;
}
