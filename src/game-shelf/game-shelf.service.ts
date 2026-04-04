import { Game } from "../games/game.model";
import { Genre } from "../genres/genres.model";
import { Platform } from "../platforms/platform.model";
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
	return await GameShelf.findAll({
		where: { userId },
		include: [
			{ model: Game, include: [{ model: Genre }] },
			{ model: Platform },
			{ model: User }
		]
	});
}

export async function findPublicGameShelfByUserId(userId: string) {
	return await GameShelf.findAll({
		where: { userId, isPublic: true },
		include: [
			{ model: Game, include: [{ model: Genre }] },
			{ model: Platform }
		]
	});
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
