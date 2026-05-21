import { Request, Response } from "express";
import { GenreCodeParam } from "./schemas/genre-code-params.schema";
import * as genreService from "./genres.service";
import * as genreDomainError from "./errors/genres.domain-error";
import * as gamesService from "../games/games.service";
import { gameSerializer } from "../games/games.serializer";
import { RegisterGenreDto } from "./dtos/register-genre.dto";
import { UpdateGenreDto } from "./dtos/update-genre.dto";
import { GenreIdParam } from "./schemas/genre-id-params.schema";

export async function getGenreByCode(request: Request, response: Response) {
	const param = request.locals.params as GenreCodeParam;

	const { code } = param;

	const genre = await genreService.findGenreByCode(code);
	if (!genre) throw genreDomainError.genreNotFound();

	const genrePlain = genre.get({ plain: true });

	const data = { genre: genrePlain };
	return response.status(200).json({ data });
}

export async function getAllGenres(_request: Request, response: Response) {
	const genres = await genreService.findAllGenres();
	const genresPlain = genres.map(genre => genre.get({ plain: true }));

	const data = { genres: genresPlain };
	return response.status(200).json({ data });
}

export async function postGenre(request: Request, response: Response) {
	const registerGenreDto = request.locals.body as RegisterGenreDto;

	const registerGenre = await genreService.registerGenre(registerGenreDto);
	const genrePlain = registerGenre.get({ plain: true });

	const data = { genre: genrePlain };
	return response.status(201).json({ data });
}

export async function patchGenre(request: Request, response: Response) {
	const updateGenreDto = request.locals.body as UpdateGenreDto;
	const genreIdParam = request.locals.params as GenreIdParam;

	const { genreId } = genreIdParam;

	const genre = await genreService.updateGenre(genreId, updateGenreDto);

	const genrePlain = genre.get({ plain: true });

	const data = { genre: genrePlain };
	return response.status(200).json({ data });
}

export async function getGamesByGenre(request: Request, response: Response) {
	const param = request.locals.params as GenreCodeParam;

	const { code } = param;

	const genre = await genreService.findGenreByCode(code);
	if (!genre) throw genreDomainError.genreNotFound();

	const games = await gamesService.findGamesByGenreCode(code);
	const gamesPlain = games.map(game => game.get({ plain: true }));

	const data = {
		genre: genre.get({ plain: true }),
		games: gamesPlain.map(g => gameSerializer(g))
	};
	return response.status(200).json({ data });
}

export async function deleteGenre(request: Request, response: Response) {
	const genreIdParam = request.locals.params as GenreIdParam;

	const { genreId } = genreIdParam;

	await genreService.removeGenre(genreId);
	return response.sendStatus(204);
}
