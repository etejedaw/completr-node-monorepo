import slugify from "slugify";
import { RegisterPlatformDto } from "./dtos/register-platform.dto";
import * as platformServiceError from "./errors/platforms.service-error";
import { Platform } from "./platform.model";
import { UniqueConstraintError, ValidationError } from "sequelize";
import { UpdatePlatformDto } from "./dtos/update-platform.dto";

export async function registerPlatform(
	registerPlatformDto: RegisterPlatformDto
) {
	try {
		const code = slugifyTitle(registerPlatformDto.name);
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
	return await Platform.findOne({ where: { code, isActive: true } });
}

export async function findPlaformById(id: string) {
	return await Platform.findOne({ where: { id, isActive: true } });
}

export async function findAllPlatforms() {
	return await Platform.findAll({ where: { isActive: true } });
}

export async function findPlatformsByCode(codes: string[]) {
	return await Platform.findAll({ where: { code: codes, isActive: true } });
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

	const code = slugifyTitle(title);

	await platform.update({ title, code });
	return platform;
}

export async function deactivatePlatform(id: string) {
	const platform = await findPlaformById(id);
	if (!platform) return false;

	await platform.update({ isActive: false });
	return true;
}

export async function reactivatePlatform(id: string) {
	const platform = await findPlaformById(id);
	if (!platform) return false;

	await platform.update({ isActive: true });
	return true;
}

function slugifyTitle(title: string) {
	return slugify(title, {
		replacement: "-",
		lower: true,
		strict: true
	});
}
