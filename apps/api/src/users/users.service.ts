import { type IncludeOptions, Op, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { sequelize } from "../database/sequelize.database";
import { USER_CARD_ATTRS } from "./constants/user-attrs.constants";
import {
	ADMIN_USERS_DEFAULT_LIMIT,
	USER_DISCOVER_DEFAULT_LIMIT,
	USER_SEARCH_DEFAULT_LIMIT
} from "./constants/user-limits.constants";
import { type CreateUserDto, type UpdateUserDto } from "./dtos";
import * as usersServiceError from "./errors/users.service-error";
import { canUseTheme } from "./helpers/theme.helper";
import { User } from "./user.model";
import { type AdminUserFields } from "./users.interface";

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

export async function isEmailRegistered(email: string) {
	const count = await User.count({ where: { email } });
	return count > 0;
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

export async function searchUsers(
	query: string,
	limit = USER_SEARCH_DEFAULT_LIMIT
) {
	const nameWhere = buildTextSearchWhere(query, [
		"User.username",
		"User.name"
	]);
	if (!nameWhere) return [];
	return User.findAll({
		where: { isActive: true, ...nameWhere },
		attributes: USER_CARD_ATTRS,
		limit,
		order: [
			["username", "ASC"],
			["id", "ASC"]
		]
	});
}

export async function findUserIdsMatchingSearch(
	query: string
): Promise<string[] | null> {
	const nameWhere = buildTextSearchWhere(query, ["User.username"]);
	if (!nameWhere) return null;
	const users = await User.findAll({
		where: nameWhere,
		attributes: ["id"]
	});
	return users.map(user => user.id);
}

export async function findUserByExactEmail(email: string) {
	const user = await User.findOne({
		where: { email: email.toLowerCase(), isActive: true },
		attributes: USER_CARD_ATTRS
	});
	return user ? [user] : [];
}

export async function findRandomPublicUsers(
	limit = USER_DISCOVER_DEFAULT_LIMIT,
	excludeUserId?: string
) {
	return User.findAll({
		where: {
			isActive: true,
			profileVisibility: "public",
			...(excludeUserId && { id: { [Op.ne]: excludeUserId } })
		},
		attributes: USER_CARD_ATTRS,
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

	if (
		updateUserDto.theme &&
		!(await canUseTheme(updateUserDto.theme, user))
	) {
		throw usersServiceError.themeForbiddenError();
	}

	const disabledFollowRequests =
		updateUserDto.acceptFollowRequests === false &&
		user.acceptFollowRequests === true;

	try {
		await user.update(updateUserDto);
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: usersServiceError.uniqueConstraintError,
			validation: usersServiceError.validationError
		});
	}

	return { user, disabledFollowRequests };
}

export async function adminUpdateUser(id: string, fields: AdminUserFields) {
	const user = await findUserByIdUnfiltered(id);
	if (!user) throw usersServiceError.notFoundError();

	try {
		await user.update(fields);
	} catch (error) {
		rethrowSequelizeError(error, {
			validation: usersServiceError.validationError
		});
	}
	return user;
}

export async function findUserByIdUnfiltered(id: string) {
	return User.findOne({ where: { id } });
}

export async function findAllUsers(
	limit = ADMIN_USERS_DEFAULT_LIMIT,
	offset = 0,
	query?: string
) {
	const searchWhere = query
		? buildTextSearchWhere(query, [
				"User.username",
				"User.name",
				"User.email"
			])
		: null;
	return User.findAndCountAll({
		...(searchWhere ? { where: searchWhere } : {}),
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		],
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

export async function destroyUser(id: string, transaction: Transaction) {
	try {
		return await User.destroy({ where: { id }, transaction });
	} catch (error) {
		rethrowSequelizeError(error, {
			foreignKey: usersServiceError.deleteForbiddenError
		});
	}
}

export function userInclude(
	options: Omit<IncludeOptions, "model"> = {}
): IncludeOptions {
	return { model: User, ...options };
}
