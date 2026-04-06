import { ListItem } from "./list-item.model";
import { List } from "../lists/list.model";
import { Game } from "../games/game.model";
import { GameScore } from "../game-scores/game-score.model";
import { GameTime } from "../game-times/game-time.model";
import * as listItemsServiceError from "./errors/list-items.service-error";

async function freezeScores(gameId: string, list: List) {
	const [gameScore, gameTime] = await Promise.all([
		GameScore.findOne({
			where: { gameId, source: list.scoreSource }
		}),
		GameTime.findOne({
			where: { gameId, source: list.durationSource }
		})
	]);

	return {
		score: gameScore?.score ?? null,
		duration: gameTime?.duration ?? null
	};
}

export async function replaceItems(
	listId: string,
	userId: string,
	gameIds: string[]
) {
	const list = await List.findOne({ where: { id: listId } });
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== userId) throw listItemsServiceError.forbiddenError();

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

export async function refreshScores(listId: string, userId: string) {
	const list = await List.findOne({ where: { id: listId } });
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== userId) throw listItemsServiceError.forbiddenError();

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
