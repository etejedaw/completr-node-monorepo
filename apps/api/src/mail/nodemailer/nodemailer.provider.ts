import nodemailer, { type Transporter } from "nodemailer";

import * as mailServiceError from "../errors/mail.service-error";
import { type MailMessage, type MailModel } from "../mail.interface";
import { type NodemailerSettings } from "./nodemailer.interface";

const SMTP_TIMEOUT_MS = 10_000;

export abstract class NodemailerModel implements MailModel {
	abstract readonly isEnabled: boolean;

	static create(settings: NodemailerSettings): NodemailerModel {
		if (!settings.host) return new DisabledNodemailerProvider();
		return new NodemailerProvider({ ...settings, host: settings.host });
	}

	abstract send(message: MailMessage): Promise<void>;
}

export class NodemailerProvider extends NodemailerModel {
	readonly isEnabled = true;

	private readonly transporter: Transporter;

	constructor(
		private readonly settings: NodemailerSettings & { host: string }
	) {
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

export class DisabledNodemailerProvider extends NodemailerModel {
	readonly isEnabled = false;

	send(): Promise<void> {
		return Promise.reject(mailServiceError.disabledError());
	}
}
