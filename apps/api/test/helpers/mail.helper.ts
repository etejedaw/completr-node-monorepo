import { InMemoryMailModel } from "../../src/mail/in-memory/in-memory.provider";
import { type MailMessage } from "../../src/mail/mail.interface";
import { eventually } from "./eventually.helper";

const ONE_TIME_TOKEN_IN_URL = /token=([a-f0-9]{64})/;

export function clearOutbox() {
	InMemoryMailModel.outbox.length = 0;
}

export function findLastMailTo(email: string): MailMessage | undefined {
	return InMemoryMailModel.outbox.findLast(mail => mail.to === email);
}

export function waitForMailTo(email: string): Promise<MailMessage> {
	return eventually(async () => {
		const mail = findLastMailTo(email);
		if (!mail) throw new Error(`No mail sent to ${email}`);
		return mail;
	});
}

export function extractTokenFromMail(mail: MailMessage): string {
	const token = ONE_TIME_TOKEN_IN_URL.exec(mail.text)?.[1];
	if (!token) throw new Error("Mail does not contain a one-time token");
	return token;
}
