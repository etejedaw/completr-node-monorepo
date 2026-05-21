import { ListItem } from "./list-item.model";
import { List } from "../lists/list.model";
import { Game } from "../games/game.model";
import { GameScore } from "../game-scores/game-score.model";
import { GameTime } from "../game-times/game-time.model";
import { ScoreSource } from "../score-sources/score-source.model";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as listItemsServiceError from "./errors/list-items.service-error";

const FREE_LIST_LIMIT = 5;

function isPremium(role: string) {
	return role === "premium" || role === "moderator" || role === "admin";
}

async function checkFrozen(userId: string, role: string) {
	if (isPremium(role)) return;
	const count = await List.count({ where: { userId } });
	if (count > FREE_LIST_LIMIT) throw listItemsServiceError.frozenError();
}

async function freezeScores(gameId: string, list: List) {
	const [gameScore, gameTime, scoreSource] = await Promise.all([
		GameScore.findOne({
			where: { gameId, source: list.scoreSource }
		}),
		GameTime.findOne({
			where: { gameId, source: list.durationSource }
		}),
		ScoreSource.findOne({ where: { code: list.scoreSource } })
	]);

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

	if (toDelete.length > 0) {
		await ListItem.destroy({
			where: { id: toDelete.map(item => item.id) }
		});
	}

	for (const gameId of toCreate) {
		const { score, duration } = await freezeScores(gameId, list);
		await ListItem.create({ listId, gameId, position: 0, score, duration });
	}

	const allItems = await ListItem.findAll({
		where: { listId },
		include: [{ model: Game }]
	});

	const gameIdOrder = new Map(gameIds.map((id, index) => [id, index + 1]));
	await Promise.all(
		allItems.map(item =>
			item.update({ position: gameIdOrder.get(item.gameId) })
		)
	);

	return ListItem.findAll({
		where: { listId },
		include: [{ model: Game }],
		order: [["position", "ASC"]]
	});
}

export async function refreshScores(listId: string, user: RequestUser) {
	const list = await List.findOne({ where: { id: listId } });
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== user.id) throw listItemsServiceError.forbiddenError();
	await checkFrozen(user.id, user.role);

	const items = await ListItem.findAll({ where: { listId } });

	const updates = await Promise.all(
		items.map(async item => {
			const { score, duration } = await freezeScores(item.gameId, list);
			await item.update({ score, duration });
			return item;
		})
	);

	return updates.length;
}
