import z from "zod";

const EnvironmentConfigSchema = z
	.object({
		NODE_ENV: z.enum(["test", "dev", "stg", "prd"]).default("dev"),
		PORT: z.coerce.number().default(3000),
		ACCESS_TOKEN_TTL: z.union([z.string(), z.number()]).default("15m"),
		ACCESS_TOKEN_SECRET: z.string().default("secret-token"),
		REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
		PASSWORD_SALT_ROUNDS: z.coerce.number().default(10),
		CORS_ORIGIN: z.string().default("*"),
		CORS_METHODS: z.string().default("*"),
		CORS_ALLOWED_HEADERS: z.string().default("*"),
		CORS_CREDENTIALS: z.stringbool().default(false)
	})
	.readonly();

export const environmentConfig = EnvironmentConfigSchema.parse(process.env);
