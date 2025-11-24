import { CreateUserDto, UpdateUserDto } from "./dtos";
import { User } from "./user.model";

export async function createUser(createUserDto: CreateUserDto) {
	return User.create(createUserDto);
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
	if (!user) return;

	await user.update(updateUserDto);
	return user;
}

export async function updatePassword(id: string, hashPassword: string) {
	const user = await findUserById(id);
	if (!user) return;

	await user.update({ password: hashPassword });
	return user;
}

export async function deactivateUser(id: string) {
	const user = await findUserById(id);
	if (!user) return;

	await user.update({ isActive: false });
	return user;
}

export async function reactivateUser(id: string) {
	const user = await findUserById(id);
	if (!user) return;

	await user.update({ isActive: true });
	return user;
}
