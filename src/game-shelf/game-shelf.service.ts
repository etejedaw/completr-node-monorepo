import { Game } from "../games/game.model";
import { Genre } from "../genres/genres.model";
import { Platform } from "../platforms/platform.model";
import { Playthrough } from "../playthroughs/playthrough.model";
import { User } from "../users";
import { RegisterGameShelfDto } from "./dtos/register-game-shelf.dto";
import { UpdateGameShelfDto } from "./dtos/update-game-shelf.dto";
import { GameShelf } from "./game-shelf.model";
import * as gameShelfServiceError from "./errors/game-shelf.service-error";

export async function registerGameShelf(
	userId: string,
	registerGameShelfDto: RegisterGameShelfDto
) {
	return GameShelf.create({ ...registerGameShelfDto, userId });
}

export async function findGameShelfById(id: string) {
	return await GameShelf.findOne({ where: { id } });
}

export async function findGameShelfByUserId(userId: string) {
	const shelfItems = await GameShelf.findAll({
		where: { userId },
		include: [
			{ model: Game, include: [{ model: Genre }] },
			{ model: Platform },
			{ model: User }
		]
	});

	const gameIds = shelfItems.map(item => item.gameId);

	const completedPlaythroughs = await Playthrough.findAll({
		where: { userId, gameId: gameIds, status: "completed" },
		order: [["finishedAt", "ASC"]]
	});

	const playthroughMap = new Map<string, number>();
	for (const pt of completedPlaythroughs) {
		if (!playthroughMap.has(pt.gameId) && pt.realDuration) {
			playthroughMap.set(pt.gameId, pt.realDuration);
		}
	}

	return { shelfItems, playthroughMap };
}

export async function updateGameShelf(
	id: string,
	userId: string,
	updateGameShelfDto: UpdateGameShelfDto
) {
	const gameShelf = await findGameShelfById(id);
	if (!gameShelf) throw gameShelfServiceError.notFoundError();
	if (gameShelf.userId !== userId)
		throw gameShelfServiceError.forbiddenError();

	await gameShelf.update(updateGameShelfDto);
	return gameShelf;
}

export async function removeGameShelf(id: string, userId: string) {
	const gameShelf = await findGameShelfById(id);
	if (!gameShelf) return false;
	if (gameShelf.userId !== userId) return false;

	await GameShelf.destroy({ where: { id, userId } });
	return true;
}
