import { Op } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { sequelize } from "../database/sequelize.database";
import { USER_PUBLIC_ATTRS } from "./constants/user-attrs.constants";
import { CreateUserDto, UpdateUserDto } from "./dtos";
import * as usersServiceError from "./errors/users.service-error";
import { canUseTheme } from "./helpers/theme.helper";
import { User } from "./user.model";

export async function createUser(createUserDto: CreateUserDto) {
	try {
		return await User.create(createUserDto);
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: usersServiceError.uniqueConstraintError,
			validation: usersServiceError.validationError
		});
	}
}

export async function findUserByEmail(email: string) {
	return await User.findOne({
		where: { email, isActive: true }
	});
}

export async function findUserByUsername(username: string) {
	return await User.findOne({
		where: { username, isActive: true }
	});
}

export async function findUserById(id: string) {
	return await User.findOne({
		where: { id, isActive: true }
	});
}

export async function findUsersByIds(ids: string[]) {
	if (ids.length === 0) return [];
	return User.findAll({ where: { id: ids } });
}

export async function countActiveUsers() {
	return User.count({ where: { isActive: true } });
}

export async function searchUsers(query: string, limit = 20) {
	return User.findAll({
		where: {
			isActive: true,
			[Op.or]: [
				{ username: { [Op.iLike]: `%${query}%` } },
				{ name: { [Op.iLike]: `%${query}%` } }
			]
		},
		attributes: [...USER_PUBLIC_ATTRS, "profileVisibility"],
		limit,
		order: [["username", "ASC"]]
	});
}

export async function findUserByExactEmail(email: string) {
	const user = await User.findOne({
		where: { email: email.toLowerCase(), isActive: true },
		attributes: [...USER_PUBLIC_ATTRS, "profileVisibility"]
	});
	return user ? [user] : [];
}

export async function findRandomPublicUsers(
	limit = 12,
	excludeUserId?: string
) {
	const where: Record<string, unknown> = {
		isActive: true,
		profileVisibility: "public"
	};
	if (excludeUserId) {
		where.id = { [Op.ne]: excludeUserId };
	}
	return User.findAll({
		where,
		attributes: [...USER_PUBLIC_ATTRS, "profileVisibility"],
		order: sequelize.literal("RANDOM()"),
		limit
	});
}

export async function updateUser(
	id: string,
	updateUserDto: UpdateUserDto
): Promise<{ user: User; disabledFollowRequests: boolean }> {
	const user = await findUserById(id);
	if (!user) throw usersServiceError.notFoundError();

	if (updateUserDto.theme && !canUseTheme(updateUserDto.theme, user.role)) {
		throw usersServiceError.themeForbiddenError();
	}

	const disabledFollowRequests =
		updateUserDto.acceptFollowRequests === false &&
		user.acceptFollowRequests === true;

	await user.update(updateUserDto);

	return { user, disabledFollowRequests };
}

export async function findUserByIdUnfiltered(id: string) {
	return User.findOne({ where: { id } });
}

export async function findAllUsers(limit = 50, offset = 0) {
	return User.findAndCountAll({
		order: [["createdAt", "DESC"]],
		limit,
		offset
	});
}

export async function updatePassword(id: string, hashPassword: string) {
	const user = await findUserById(id);
	if (!user) throw usersServiceError.notFoundError();

	await user.update({ password: hashPassword });
	return user;
}

export async function deactivateUser(id: string) {
	const user = await findUserById(id);
	if (!user) throw usersServiceError.notFoundError();

	await user.update({ isActive: false });
	return user;
}

export async function reactivateUser(id: string) {
	const user = await findUserById(id);
	if (!user) throw usersServiceError.notFoundError();

	await user.update({ isActive: true });
	return user;
}
