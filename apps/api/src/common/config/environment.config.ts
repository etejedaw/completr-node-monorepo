import z from "zod";

const EnvironmentConfigSchema = z
	.object({
		NODE_ENV: z.enum(["test", "dev", "stg", "prd"]).default("dev"),
		PORT: z.coerce.number().default(3000),
		ACCESS_TOKEN_TTL: z.union([z.string(), z.number()]).default("15m"),
		ACCESS_TOKEN_SECRET: z.string().default("secret-token"),
		REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
		PASSWORD_SALT_ROUNDS: z.coerce.number().default(10),
		CORS_ORIGIN: z.string().default("http://localhost:4200"),
		CORS_METHODS: z.string().default("GET,POST,PATCH,PUT,DELETE,OPTIONS"),
		CORS_ALLOWED_HEADERS: z.string().default("Content-Type,Authorization"),
		CORS_CREDENTIALS: z.stringbool().default(true),
		COOKIE_DOMAIN: z.string().optional(),
		COOKIE_SECURE: z.stringbool().default(false),
		COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
		CHANGELOG_SOURCE_URL: z
			.url()
			.default("http://localhost:4321/changelog.json")
	})
	.readonly();

export const environmentConfig = EnvironmentConfigSchema.parse(process.env);
