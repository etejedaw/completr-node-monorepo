import { Op, UniqueConstraintError, ValidationError } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { CreateUserDto, UpdateUserDto } from "./dtos";
import { User } from "./user.model";
import { canUseTheme } from "./theme-catalog";
import * as usersServiceError from "./errors/users.service-error";

export async function createUser(createUserDto: CreateUserDto) {
	try {
		return await User.create(createUserDto);
	} catch (error) {
		if (error instanceof UniqueConstraintError)
			throw usersServiceError.uniqueConstraintError(error);
		if (error instanceof ValidationError)
			throw usersServiceError.validationError(error);
		throw error;
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

export async function searchUsers(query: string, limit = 20) {
	return User.findAll({
		where: {
			isActive: true,
			[Op.or]: [
				{ username: { [Op.iLike]: `%${query}%` } },
				{ name: { [Op.iLike]: `%${query}%` } }
			]
		},
		attributes: ["id", "username", "name", "avatarUrl", "isPublic"],
		limit,
		order: [["username", "ASC"]]
	});
}

export async function findUserByExactEmail(email: string) {
	const user = await User.findOne({
		where: { email: email.toLowerCase(), isActive: true },
		attributes: ["id", "username", "name", "avatarUrl", "isPublic"]
	});
	return user ? [user] : [];
}

export async function findRandomPublicUsers(
	limit = 12,
	excludeUserId?: string
) {
	const where: Record<string, unknown> = {
		isActive: true,
		isPublic: true
	};
	if (excludeUserId) {
		where.id = { [Op.ne]: excludeUserId };
	}
	return User.findAll({
		where,
		attributes: ["id", "username", "name", "avatarUrl", "isPublic"],
		order: sequelize.literal("RANDOM()"),
		limit
	});
}

export async function updateUser(id: string, updateUserDto: UpdateUserDto) {
	const user = await findUserById(id);
	if (!user) throw usersServiceError.notFoundError();

	if (updateUserDto.theme && !canUseTheme(updateUserDto.theme, user.role)) {
		throw usersServiceError.themeForbiddenError();
	}

	await user.update(updateUserDto);
	return user;
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
