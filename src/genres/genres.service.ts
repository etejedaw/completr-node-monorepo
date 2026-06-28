import { Sequelize } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import { type RegisterGenreDto } from "./dtos/register-genre.dto";
import { type UpdateGenreDto } from "./dtos/update-genre.dto";
import * as genreServiceError from "./errors/genres.service-error";
import { Genre } from "./genres.model";

export async function registerGenre(registerGenre: RegisterGenreDto) {
	try {
		const code = titleToSlug(registerGenre.name);
		return await Genre.create({ ...registerGenre, code });
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: genreServiceError.uniqueConstraintError,
			validation: genreServiceError.validationError
		});
	}
}

export async function findGenreByCode(code: string) {
	return await Genre.findOne({ where: { code } });
}

export async function findGenreById(id: string) {
	return await Genre.findOne({ where: { id } });
}

export async function findAllGenres() {
	return await Genre.findAll();
}

export async function findGenresByCode(codes: string[]) {
	return await Genre.findAll({ where: { code: codes } });
}

export async function updateGenre(id: string, updateGenreDto: UpdateGenreDto) {
	const genre = await findGenreById(id);
	if (!genre) throw genreServiceError.notFoundError();

	const name = updateGenreDto.name;
	const code = titleToSlug(name);

	await genre.update({ name, code });
	return genre;
}

export async function findRandomGenre() {
	return await Genre.findOne({
		order: Sequelize.literal("RANDOM()")
	});
}

export async function removeGenre(id: string) {
	const genre = await findGenreById(id);
	if (!genre) return false;

	await Genre.destroy({ where: { id } });
	return true;
}
