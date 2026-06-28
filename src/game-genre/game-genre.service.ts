import { type Transaction } from "sequelize";

import { GameGenre } from "./game-genre.model";

export async function linkGameToGenres(
	gameId: string,
	genreIds: string[],
	transaction?: Transaction
) {
	const gameGenres = genreIds.map(genreId => ({ gameId, genreId }));
	return GameGenre.bulkCreate(gameGenres, {
		ignoreDuplicates: true,
		transaction
	});
}

export async function replaceGameGenres(gameId: string, genreIds: string[]) {
	await GameGenre.destroy({ where: { gameId } });
	if (!genreIds.length) return;

	return linkGameToGenres(gameId, genreIds);
}
