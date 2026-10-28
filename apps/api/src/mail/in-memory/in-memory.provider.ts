import { type MailMessage, type MailModel } from "../mail.interface";

export class InMemoryMailModel implements MailModel {
	static readonly outbox: MailMessage[] = [];

	readonly isEnabled = true;

	send(message: MailMessage): Promise<void> {
		InMemoryMailModel.outbox.push(message);
		return Promise.resolve();
	}
}
