import { Op } from "sequelize";
import { ListItem } from "./list-item.model";
import { List } from "../lists/list.model";
import { Game } from "../games/game.model";
import { GameScore } from "../game-scores/game-score.model";
import { GameTime } from "../game-times/game-time.model";
import * as listItemsServiceError from "./errors/list-items.service-error";

async function getNextPosition(listId: string): Promise<number> {
	const maxItem = await ListItem.findOne({
		where: { listId },
		order: [["position", "DESC"]]
	});
	return maxItem ? maxItem.position + 1 : 1;
}

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

export async function addItem(listId: string, userId: string, gameId: string) {
	const list = await List.findOne({ where: { id: listId } });
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== userId) throw listItemsServiceError.forbiddenError();

	const existing = await ListItem.findOne({ where: { listId, gameId } });
	if (existing)
		throw listItemsServiceError.uniqueConstraintError(
			"Game already in list"
		);

	const position = await getNextPosition(listId);
	const { score, duration } = await freezeScores(gameId, list);

	const item = await ListItem.create({
		listId,
		gameId,
		position,
		score,
		duration
	});

	await item.reload({ include: [{ model: Game }] });
	return item;
}

export async function updateItemPosition(
	listId: string,
	itemId: string,
	userId: string,
	newPosition: number
) {
	const list = await List.findOne({ where: { id: listId } });
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== userId) throw listItemsServiceError.forbiddenError();

	const item = await ListItem.findOne({ where: { id: itemId, listId } });
	if (!item) throw listItemsServiceError.notFoundError();

	const oldPosition = item.position;
	if (oldPosition === newPosition) return item;

	if (newPosition > oldPosition) {
		await ListItem.update(
			{ position: ListItem.sequelize!.literal("position - 1") },
			{
				where: {
					listId,
					position: { [Op.gt]: oldPosition, [Op.lte]: newPosition }
				}
			}
		);
	} else {
		await ListItem.update(
			{ position: ListItem.sequelize!.literal("position + 1") },
			{
				where: {
					listId,
					position: { [Op.gte]: newPosition, [Op.lt]: oldPosition }
				}
			}
		);
	}

	await item.update({ position: newPosition });
	await item.reload({ include: [{ model: Game }] });
	return item;
}

export async function removeItem(
	listId: string,
	itemId: string,
	userId: string
) {
	const list = await List.findOne({ where: { id: listId } });
	if (!list) throw listItemsServiceError.listNotFoundError();
	if (list.userId !== userId) throw listItemsServiceError.forbiddenError();

	const item = await ListItem.findOne({ where: { id: itemId, listId } });
	if (!item) throw listItemsServiceError.notFoundError();

	const removedPosition = item.position;
	await ListItem.destroy({ where: { id: itemId } });

	await ListItem.update(
		{ position: ListItem.sequelize!.literal("position - 1") },
		{
			where: {
				listId,
				position: { [Op.gt]: removedPosition }
			}
		}
	);

	return true;
}
