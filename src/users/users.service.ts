import { UniqueConstraintError, ValidationError } from "sequelize";
import { CreateUserDto, UpdateUserDto } from "./dtos";
import { User } from "./user.model";
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

export async function updateUser(id: string, updateUserDto: UpdateUserDto) {
	const user = await findUserById(id);
	if (!user) throw usersServiceError.notFoundError();

	await user.update(updateUserDto);
	return user;
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
