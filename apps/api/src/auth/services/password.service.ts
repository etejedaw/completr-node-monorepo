import bcrypt from "bcrypt";

import { environmentConfig } from "../../common/config/environment.config";

const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
	"unknown-account-placeholder",
	environmentConfig.PASSWORD_SALT_ROUNDS
);

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, environmentConfig.PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(
	password: string,
	hash: string
): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export async function burnPasswordCheck(password: string): Promise<void> {
	await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
}
