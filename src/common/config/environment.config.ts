import z from "zod";

const EnvironmentConfigSchema = z
	.object({
		NODE_ENV: z.enum(["test", "dev", "stg", "prd"]).default("dev"),
		PORT: z.coerce.number().default(3000),
		PG_DATABASE: z.string().default("postgres"),
		PG_USER: z.string().default("root"),
		PG_PASSWORD: z.string().default("toor"),
		PG_HOST: z.string().default("127.0.0.1"),
		PG_PORT: z.coerce.number().default(5432),
		ACCESS_TOKEN_TTL: z.union([z.string(), z.number()]).default("1d"),
		ACCESS_TOKEN_SECRET: z.string().default("secret-token"),
		PASSWORD_SALT_ROUNDS: z.number().default(10),
		CORS_ORIGIN: z.string().default("*"),
		CORS_METHODS: z.string().default("*"),
		CORS_ALLOWED_HEADERS: z.string().default("*"),
		CORS_CREDENTIALS: z.boolean().default(false)
	})
	.readonly();

export const environmentConfig = EnvironmentConfigSchema.parse(process.env);
