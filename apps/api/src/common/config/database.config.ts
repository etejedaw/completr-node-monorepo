import z from "zod";

import { environmentConfig } from "./environment.config";

const isTestEnvironment = environmentConfig.NODE_ENV === "test";

const DatabaseConfigSchema = z
	.object({
		PG_DATABASE: z
			.string()
			.default(isTestEnvironment ? "completr_test" : "completr"),
		PG_USER: z.string().default("root"),
		PG_PASSWORD: z.string().default("toor"),
		PG_HOST: z.string().default("127.0.0.1"),
		PG_PORT: z.coerce.number().default(isTestEnvironment ? 5433 : 5432)
	})
	.readonly();

export const databaseConfig = DatabaseConfigSchema.parse(process.env);
