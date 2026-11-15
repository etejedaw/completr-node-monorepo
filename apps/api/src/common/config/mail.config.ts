import z from "zod";

const DEFAULT_SUPPORT_EMAIL = "completr@etejeda.dev";

const optionalSetting = z
	.string()
	.trim()
	.optional()
	.transform(value => value || undefined);

const MailConfigSchema = z
	.object({
		SMTP_HOST: optionalSetting,
		SMTP_PORT: z.coerce.number().default(587),
		SMTP_SECURE: z.stringbool().default(false),
		SMTP_USER: optionalSetting,
		SMTP_PASSWORD: optionalSetting,
		MAIL_FROM: z.string().default("Completr <completr@email.etejeda.dev>"),
		SUPPORT_EMAIL: z.preprocess(
			value => value || undefined,
			z.email().default(DEFAULT_SUPPORT_EMAIL)
		),
		DATA_REQUESTS_NOTIFY_EMAIL: z.preprocess(
			value => value || undefined,
			z.email().default(DEFAULT_SUPPORT_EMAIL)
		)
	})
	.readonly();

export const mailConfig = MailConfigSchema.parse(process.env);
