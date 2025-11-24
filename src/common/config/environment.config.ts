import z from "zod";

const EnvironmentConfigSchema = z
	.object({
		PORT: z.coerce.number().default(3000),
		NODE_ENV: z.enum(["test", "dev", "stg", "prd"]).default("dev"),
		PG_DATABASE: z.string().default("postgres"),
		PG_USER: z.string().default("root"),
		PG_PASSWORD: z.string().default("toor"),
		PG_HOST: z.string().default("127.0.0.1"),
		PG_PORT: z.coerce.number().default(5432)
	})
	.readonly();

export const environmentConfig = EnvironmentConfigSchema.parse(process.env);
