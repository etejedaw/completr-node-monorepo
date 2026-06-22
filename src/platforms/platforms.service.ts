import { RegisterPlatformDto } from "./dtos/register-platform.dto";
import * as platformServiceError from "./errors/platforms.service-error";
import { Platform } from "./platform.model";
import { UpdatePlatformDto } from "./dtos/update-platform.dto";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";

export async function registerPlatform(
	registerPlatformDto: RegisterPlatformDto
) {
	try {
		const code = titleToSlug(registerPlatformDto.name);
		return await Platform.create({ ...registerPlatformDto, code });
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: platformServiceError.uniqueConstraintError,
			validation: platformServiceError.validationError
		});
	}
}

export async function findPlatformByCode(code: string) {
	return await Platform.findOne({ where: { code } });
}

export async function findPlatformById(id: string) {
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
	const platform = await findPlatformById(id);
	if (!platform) throw platformServiceError.notFoundError();

	await platform.update(updatePlatformDto);
	return platform;
}

export async function removePlatform(id: string) {
	const platform = await findPlatformById(id);
	if (!platform) return false;

	await Platform.destroy({ where: { id } });
	return true;
}
