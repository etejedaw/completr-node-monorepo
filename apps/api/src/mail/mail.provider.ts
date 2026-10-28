import { environmentConfig } from "../common/config/environment.config";
import { mailConfig } from "../common/config/mail.config";
import * as mailServiceError from "./errors/mail.service-error";
import { InMemoryMailModel } from "./in-memory/in-memory.provider";
import { type MailMessage, type MailModel } from "./mail.interface";
import { NodemailerModel } from "./nodemailer/nodemailer.provider";

export class MailProvider {
	constructor(private readonly model: MailModel) {}

	get isConfigured(): boolean {
		return this.model.isEnabled;
	}

	assertConfigured(): void {
		if (!this.isConfigured) throw mailServiceError.disabledError();
	}

	async send(message: MailMessage): Promise<void> {
		this.assertConfigured();
		await this.model.send(message);
	}
}

function createMailModel(): MailModel {
	if (environmentConfig.NODE_ENV === "test") return new InMemoryMailModel();
	return NodemailerModel.create({
		host: mailConfig.SMTP_HOST,
		port: mailConfig.SMTP_PORT,
		secure: mailConfig.SMTP_SECURE,
		user: mailConfig.SMTP_USER,
		password: mailConfig.SMTP_PASSWORD,
		from: mailConfig.MAIL_FROM
	});
}

export const mailProvider = new MailProvider(createMailModel());
