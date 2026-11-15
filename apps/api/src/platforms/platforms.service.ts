import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import { type RegisterPlatformDto } from "./dtos/register-platform.dto";
import { type UpdatePlatformDto } from "./dtos/update-platform.dto";
import * as platformServiceError from "./errors/platforms.service-error";
import { Platform } from "./platform.model";

function platformCodeFromName(name: string) {
	const code = titleToSlug(name);
	if (!code) throw platformServiceError.validationError({ name });
	return code;
}

export async function registerPlatform(
	registerPlatformDto: RegisterPlatformDto
) {
	try {
		const code = platformCodeFromName(registerPlatformDto.name);
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
	return Platform.findAll({
		order: [
			["name", "ASC"],
			["id", "ASC"]
		]
	});
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

	try {
		await platform.update(updatePlatformDto);
		return platform;
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: platformServiceError.uniqueConstraintError,
			validation: platformServiceError.validationError
		});
	}
}

export async function removePlatform(id: string) {
	const platform = await findPlatformById(id);
	if (!platform) throw platformServiceError.notFoundError();

	try {
		await Platform.destroy({ where: { id } });
	} catch (error) {
		rethrowSequelizeError(error, {
			foreignKey: platformServiceError.inUseError
		});
	}
}
