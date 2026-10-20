import nodemailer, { type Transporter } from "nodemailer";

import * as mailServiceError from "./errors/mail.service-error";
import { type MailMessage, type SmtpSettings } from "./mail.interface";

const SMTP_TIMEOUT_MS = 10_000;

export abstract class MailClient {
	abstract readonly isEnabled: boolean;

	static create(settings: SmtpSettings): MailClient {
		if (!settings.host) return new DisabledMailProvider();
		return new SmtpMailProvider({ ...settings, host: settings.host });
	}

	abstract send(message: MailMessage): Promise<void>;
}

export class SmtpMailProvider extends MailClient {
	readonly isEnabled = true;

	private readonly transporter: Transporter;

	constructor(private readonly settings: SmtpSettings & { host: string }) {
		super();
		this.transporter = nodemailer.createTransport({
			host: settings.host,
			port: settings.port,
			secure: settings.secure,
			auth: settings.user
				? { user: settings.user, pass: settings.password }
				: undefined,
			connectionTimeout: SMTP_TIMEOUT_MS,
			greetingTimeout: SMTP_TIMEOUT_MS,
			socketTimeout: SMTP_TIMEOUT_MS
		});
	}

	async send(message: MailMessage): Promise<void> {
		try {
			await this.transporter.sendMail({
				from: this.settings.from,
				...message
			});
		} catch (error) {
			throw mailServiceError.sendError(error);
		}
	}
}

export class DisabledMailProvider extends MailClient {
	readonly isEnabled = false;

	send(): Promise<void> {
		throw mailServiceError.disabledError();
	}
}
