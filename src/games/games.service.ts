import { UniqueConstraintError, ValidationError } from "sequelize";
import { RegisterGameDto } from "./dtos/register-game.dto";
import { Game } from "./game.model";
import { UpdateGameDto } from "./dtos/update-game.dto";
import * as gamesServiceError from "./errors/games.service-error";
import * as gamePlatformsService from "../game-platform/game-platform.service";
import * as platformsService from "../platforms/platforms.service";
import { titleToSlug } from "../common/utils/title-to-slug.util";

export async function registerGame(registerGameDto: RegisterGameDto) {
	try {
		const code = titleToSlug(registerGameDto.title);
		const { platforms, ...gameDto } = registerGameDto;

		const gameDb = await Game.create({ ...gameDto, code });
		const platformsDb =
			await platformsService.findPlatformsByCode(platforms);

		await gamePlatformsService.linkGameToPlatforms(
			gameDb.id,
			platformsDb.map(platform => platform.id)
		);

		const gameCreated = await findGameById(gameDb.id);
		if (!gameCreated) throw gamesServiceError.notFoundError();

		return gameCreated;
	} catch (error) {
		if (error instanceof UniqueConstraintError)
			throw gamesServiceError.uniqueConstraintError(error);
		if (error instanceof ValidationError)
			throw gamesServiceError.validationError(error);
		throw error;
	}
}

export async function findGameByCode(code: string) {
	return await Game.findOne({
		where: { code, isActive: true },
		include: [{ association: "Platforms" }]
	});
}

export async function findGameById(id: string) {
	return await Game.findOne({
		where: { id, isActive: true },
		include: [{ association: "Platforms" }]
	});
}

export async function findAll() {
	return await Game.findAll({ include: [{ association: "Platforms" }] });
}

export async function updateGame(id: string, updateGameDto: UpdateGameDto) {
	const game = await findGameById(id);
	if (!game) throw gamesServiceError.notFoundError();

	const { platforms, ...gameDto } = updateGameDto;

	if (platforms) await platformsUpdate(game.id, platforms);

	await game.update(gameDto);

	const updatedGame = await findGameById(id);
	return updatedGame as Game;
}

export async function updateTitle(id: string, title: string) {
	const game = await findGameById(id);
	if (!game) throw gamesServiceError.notFoundError();

	const code = titleToSlug(title);

	await game.update({ title, code });
	return game;
}

export async function deactivateGame(id: string) {
	const game = await findGameById(id);
	if (!game) return false;

	await game.update({ isActive: false });
	return true;
}

export async function reactivateGame(id: string) {
	const game = await findGameById(id);
	if (!game) return false;

	await game.update({ isActive: true });
	return true;
}

async function platformsUpdate(gameId: string, platforms: string[]) {
	if (platforms.length === 0)
		return await gamePlatformsService.replaceGamePlatforms(gameId, []);

	const platformDb = await platformsService.findPlatformsByCode(platforms);

	if (platformDb.length !== platforms.length)
		throw gamesServiceError.platformNotFoundError();

	const platformsIds = platformDb.map(platform => platform.id);
	await gamePlatformsService.replaceGamePlatforms(gameId, platformsIds);
}
