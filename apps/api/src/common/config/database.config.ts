import z from "zod";

import { environmentConfig } from "./environment.config";

const isTestEnvironment = environmentConfig.NODE_ENV === "test";

const DEVELOPMENT_PG_PASSWORD = "toor";

export const DatabaseConfigSchema = z
	.object({
		NODE_ENV: z.enum(["test", "dev", "prod"]).default("dev"),
		PG_DATABASE: z
			.string()
			.default(isTestEnvironment ? "completr_test" : "completr"),
		PG_USER: z.string().default("root"),
		PG_PASSWORD: z.string().optional(),
		PG_HOST: z.string().default("127.0.0.1"),
		PG_PORT: z.coerce.number().default(isTestEnvironment ? 5433 : 5432)
	})
	.superRefine((database, context) => {
		if (database.NODE_ENV !== "prod") return;
		if (
			!database.PG_PASSWORD ||
			database.PG_PASSWORD === DEVELOPMENT_PG_PASSWORD
		)
			context.addIssue({
				code: "custom",
				path: ["PG_PASSWORD"],
				message:
					"PG_PASSWORD must be set to a non-default value in prod"
			});
	})
	.transform(database => ({
		...database,
		PG_PASSWORD: database.PG_PASSWORD ?? DEVELOPMENT_PG_PASSWORD
	}))
	.readonly();

export const databaseConfig = DatabaseConfigSchema.parse(process.env);
