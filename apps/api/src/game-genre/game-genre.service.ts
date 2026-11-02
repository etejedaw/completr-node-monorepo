import { QueryTypes, type Transaction } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import { type GameGenreRef } from "./game-genre.interface";
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

export async function linkGamesToGenres(
	gameIds: string[],
	genreIds: string[],
	transaction?: Transaction
) {
	const gameGenres = gameIds.flatMap(gameId =>
		genreIds.map(genreId => ({ gameId, genreId }))
	);
	if (gameGenres.length === 0) return [];
	return GameGenre.bulkCreate(gameGenres, {
		ignoreDuplicates: true,
		transaction
	});
}

export async function replaceGameGenres(
	gameId: string,
	genreIds: string[],
	transaction?: Transaction
) {
	await GameGenre.destroy({ where: { gameId }, transaction });
	if (!genreIds.length) return;

	return linkGameToGenres(gameId, genreIds, transaction);
}

export async function findGenresByGameIds(
	gameIds: string[]
): Promise<GameGenreRef[]> {
	const uniqueGameIds = [...new Set(gameIds)];
	if (uniqueGameIds.length === 0) return [];

	return sequelize.query<GameGenreRef>(
		`SELECT gg."gameId", g.code, g.name
		 FROM "GameGenres" gg
		 JOIN "Genres" g ON g.id = gg."genreId"
		 WHERE gg."gameId" IN (:gameIds)`,
		{ replacements: { gameIds: uniqueGameIds }, type: QueryTypes.SELECT }
	);
}
