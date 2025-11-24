import bcrypt from "bcrypt";
import { environmentConfig } from "../common/config/environment.config";

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, environmentConfig.PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(
	password: string,
	hash: string
): Promise<boolean> {
	return bcrypt.compare(password, hash);
}
