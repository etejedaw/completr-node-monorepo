import { randomBytes } from "node:crypto";

import z from "zod";

import * as passwordService from "../src/auth/services/password.service";
import { PinoLogger } from "../src/common/logger/pino.logger";
import { initDatabase } from "../src/database/init.database";
import { sequelize } from "../src/database/sequelize.database";
import * as usersService from "../src/users/users.service";

const logger = new PinoLogger("create-admin");

const UsernameSchema = z.string().min(4).max(15);

function usernameFromEmail(email: string) {
	return email
		.slice(0, email.indexOf("@"))
		.replace(/[^a-z0-9._]/g, "")
		.slice(0, 15);
}

const ArgsSchema = z.object({
	email: z.email().toLowerCase(),
	password: z
		.string()
		.trim()
		.min(6)
		.default(() => randomBytes(12).toString("base64url"))
});

async function main() {
	const args = ArgsSchema.parse({
		email: process.argv[2],
		password: process.argv[3]
	});

	const username = UsernameSchema.parse(usernameFromEmail(args.email));

	const createUserDto = {
		name: `Admin ${username}`,
		email: args.email,
		username,
		password: await passwordService.hashPassword(args.password)
	};

	await initDatabase();

	const user = await usersService.createUser(createUserDto);
	await user.update({ role: "admin" });

	logger.info("create", "ok", {
		username,
		email: args.email,
		password: args.password
	});

	await sequelize.close();
}

void main().catch(error => {
	logger.error("create", "failed", {
		error: error instanceof Error ? error.message : String(error)
	});
	process.exit(1);
});
