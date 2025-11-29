import { UniqueConstraintError, ValidationError } from "sequelize";
import { RegisterGameDto } from "./dtos/register-game.dto";
import { Game } from "./game.model";
import { UpdateGameDto } from "./dtos/update-game.dto";
import * as gamesServiceError from "./errors/games.service-error";
import slugify from "slugify";

export async function registerGame(registerGameDto: RegisterGameDto) {
	try {
		const code = slugifyTitle(registerGameDto.title);
		return await Game.create({ ...registerGameDto, code });
	} catch (error) {
		if (error instanceof UniqueConstraintError)
			throw gamesServiceError.uniqueConstraintError(error);
		if (error instanceof ValidationError)
			throw gamesServiceError.validationError(error);
		throw error;
	}
}

export async function findGameByCode(code: string) {
	return await Game.findOne({ where: { code, isActive: true } });
}

export async function findGameById(id: string) {
	return await Game.findOne({ where: { id, isActive: true } });
}

export async function updateGame(id: string, updateGameDto: UpdateGameDto) {
	const game = await findGameById(id);
	if (!game) throw gamesServiceError.notFoundError();

	await game.update(updateGameDto);
	return game;
}

export async function updateTitle(id: string, title: string) {
	const game = await findGameById(id);
	if (!game) throw gamesServiceError.notFoundError();

	const code = slugifyTitle(title);

	await game.update({ title, code });
	return game;
}

export async function deactivateGame(id: string) {
	const game = await findGameById(id);
	if (!game) throw gamesServiceError.notFoundError();

	await game.update({ isActive: false });
	return game;
}

export async function reactivateGame(id: string) {
	const game = await findGameById(id);
	if (!game) throw gamesServiceError.notFoundError();

	await game.update({ isActive: true });
	return game;
}

function slugifyTitle(title: string) {
	return slugify(title, {
		replacement: "-",
		lower: true,
		strict: true
	});
}
