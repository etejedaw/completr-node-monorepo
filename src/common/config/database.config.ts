import z from "zod";

const isTest = process.env.NODE_ENV === "test";

const DatabaseConfigSchema = z
	.object({
		PG_DATABASE: z.string().default(isTest ? "completr_test" : "postgres"),
		PG_USER: z.string().default("root"),
		PG_PASSWORD: z.string().default("toor"),
		PG_HOST: z.string().default("127.0.0.1"),
		PG_PORT: z.coerce.number().default(isTest ? 5433 : 5432)
	})
	.readonly();

export const databaseConfig = DatabaseConfigSchema.parse(process.env);
