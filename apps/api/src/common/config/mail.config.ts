import z from "zod";

import { type SmtpSettings } from "../../mail/mail.interface";

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
		MAIL_FROM: z.string().default("Completr <completr@email.etejeda.dev>")
	})
	.readonly();

export const mailConfig = MailConfigSchema.parse(process.env);

export const smtpSettings: SmtpSettings = {
	host: mailConfig.SMTP_HOST,
	port: mailConfig.SMTP_PORT,
	secure: mailConfig.SMTP_SECURE,
	user: mailConfig.SMTP_USER,
	password: mailConfig.SMTP_PASSWORD,
	from: mailConfig.MAIL_FROM
};
