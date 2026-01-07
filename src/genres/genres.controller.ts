import { Request, Response } from "express";
import { GenreCodeParam } from "./schemas/genre-code-params.schema";
import * as genreService from "./genres.service";
import { RegisterGenreDto } from "./dtos/register-genre.dto";
import { UpdateGenreDto } from "./dtos/update-genre.dto";
import { GenreIdParam } from "./schemas/genre-id-params.schema";

export async function getGenreByCode(request: Request, response: Response) {
	const param = request.params as GenreCodeParam;

	const { code } = param;

	const genre = await genreService.findGenreByCode(code);
	if (!genre) throw new Error("Genre not found"); // TODO: Update error message

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
	const registerGenreDto = request.body as RegisterGenreDto;

	const registerGenre = await genreService.registerGenre(registerGenreDto);
	const genrePlain = registerGenre.get({ plain: true });

	const data = { genre: genrePlain };
	return response.status(201).json({ data });
}

export async function patchGenre(request: Request, response: Response) {
	const updateGenreDto = request.body as UpdateGenreDto;
	const genreIdParam = request.params as GenreIdParam;

	const { genreId } = genreIdParam;

	const genre = await genreService.updateGenre(genreId, updateGenreDto);
	if (!genre) throw new Error("Genre Not Found"); //TODO: Update error message

	const genrePlain = genre.get({ plain: true });

	const data = { genre: genrePlain };
	return response.status(200).json({ data });
}

export async function deleteGenre(request: Request, response: Response) {
	const genreIdParam = request.params as GenreIdParam;

	const { genreId } = genreIdParam;

	await genreService.removeGenre(genreId);
	return response.sendStatus(204);
}
