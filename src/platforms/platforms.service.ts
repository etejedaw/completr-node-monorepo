import { RegisterPlatformDto } from "./dtos/register-platform.dto";
import * as platformServiceError from "./errors/platforms.service-error";
import { Platform } from "./platform.model";
import { UniqueConstraintError, ValidationError } from "sequelize";
import { UpdatePlatformDto } from "./dtos/update-platform.dto";
import { titleToSlug } from "../common/utils/title-to-slug.util";

export async function registerPlatform(
	registerPlatformDto: RegisterPlatformDto
) {
	try {
		const code = titleToSlug(registerPlatformDto.name);
		return await Platform.create({ ...registerPlatformDto, code });
	} catch (error) {
		if (error instanceof UniqueConstraintError)
			throw platformServiceError.uniqueConstraintError(error);
		if (error instanceof ValidationError)
			throw platformServiceError.validationError(error);
		throw error;
	}
}

export async function findPlaformByCode(code: string) {
	return await Platform.findOne({ where: { code } });
}

export async function findPlaformById(id: string) {
	return await Platform.findOne({ where: { id } });
}

export async function findAllPlatforms() {
	return await Platform.findAll();
}

export async function findPlatformsByCode(codes: string[]) {
	return await Platform.findAll({ where: { code: codes } });
}

export async function updatePlatform(
	id: string,
	updatePlatformDto: UpdatePlatformDto
) {
	const platform = await findPlaformById(id);
	if (!platform) throw platformServiceError.notFoundError();

	await platform.update(updatePlatformDto);
	return platform;
}

export async function updateTitle(id: string, title: string) {
	const platform = await findPlaformById(id);
	if (!platform) throw platformServiceError.notFoundError();

	const code = titleToSlug(title);

	await platform.update({ title, code });
	return platform;
}

export async function removePlatform(id: string) {
	const platform = await findPlaformById(id);
	if (!platform) return false;

	await Platform.destroy({ where: { id } });
	return true;
}
