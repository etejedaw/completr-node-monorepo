import { setTimeout as delay } from "node:timers/promises";

import { InMemoryMailModel } from "../../src/mail/in-memory/in-memory.provider";
import { type MailMessage } from "../../src/mail/mail.interface";

const MAIL_POLL_INTERVAL_MS = 10;
const MAIL_WAIT_TIMEOUT_MS = 2_000;
const ONE_TIME_TOKEN_IN_URL = /token=([a-f0-9]{64})/;

export function clearOutbox() {
	InMemoryMailModel.outbox.length = 0;
}

export function findLastMailTo(email: string): MailMessage | undefined {
	return InMemoryMailModel.outbox.findLast(mail => mail.to === email);
}

export async function waitForMailTo(email: string): Promise<MailMessage> {
	const deadline = Date.now() + MAIL_WAIT_TIMEOUT_MS;
	while (Date.now() < deadline) {
		const mail = findLastMailTo(email);
		if (mail) return mail;
		await delay(MAIL_POLL_INTERVAL_MS);
	}
	throw new Error(`No mail sent to ${email}`);
}

export function extractTokenFromMail(mail: MailMessage): string {
	const token = ONE_TIME_TOKEN_IN_URL.exec(mail.text)?.[1];
	if (!token) throw new Error("Mail does not contain a one-time token");
	return token;
}
