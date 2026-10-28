import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ServiceError } from "../../src/common/errors/service-error";
import { InMemoryMailModel } from "../../src/mail/in-memory/in-memory.provider";
import {
	type MailMessage,
	type MailModel
} from "../../src/mail/mail.interface";
import { MailProvider, mailProvider } from "../../src/mail/mail.provider";
import { captureRejection } from "../unit-helpers/mocks";

const MESSAGE: MailMessage = {
	to: "p@example.com",
	subject: "Hi <b>there</b> 👋",
	text: "Hello",
	html: "<p>Hello</p>"
};

class FakeMailModel implements MailModel {
	readonly sent: MailMessage[] = [];

	constructor(readonly isEnabled: boolean) {}

	async send(message: MailMessage): Promise<void> {
		this.sent.push(message);
		await Promise.resolve();
	}
}

void describe("mail provider with an injected model", () => {
	void it("reports the model state as configured", () => {
		assert.equal(
			new MailProvider(new FakeMailModel(true)).isConfigured,
			true
		);
		assert.equal(
			new MailProvider(new FakeMailModel(false)).isConfigured,
			false
		);
	});

	void it("delegates the message to the model it was built with", async () => {
		const model = new FakeMailModel(true);

		await new MailProvider(model).send(MESSAGE);

		assert.deepEqual(model.sent, [MESSAGE]);
	});

	void it("throws MAIL_DISABLED from assertConfigured when the model is disabled", () => {
		const provider = new MailProvider(new FakeMailModel(false));

		assert.throws(
			() => provider.assertConfigured(),
			(error: unknown) =>
				error instanceof ServiceError && error.code === "MAIL_DISABLED"
		);
	});

	void it("rejects send with MAIL_DISABLED without reaching a disabled model", async () => {
		const model = new FakeMailModel(false);

		const error = await captureRejection(
			new MailProvider(model).send(MESSAGE)
		);

		assert.ok(error instanceof ServiceError);
		assert.equal(error.code, "MAIL_DISABLED");
		assert.equal(model.sent.length, 0);
	});

	void it("sends every message of repeated concurrent calls", async () => {
		const model = new FakeMailModel(true);
		const provider = new MailProvider(model);

		await Promise.all([
			provider.send(MESSAGE),
			provider.send({ ...MESSAGE, to: "q@example.com" }),
			provider.send(MESSAGE)
		]);

		assert.deepEqual(
			model.sent.map(message => message.to),
			["p@example.com", "q@example.com", "p@example.com"]
		);
	});
});

void describe("mail provider in the test environment", () => {
	void it("uses the in-memory model and records the message in its outbox", async () => {
		InMemoryMailModel.outbox.length = 0;

		assert.equal(mailProvider.isConfigured, true);
		await mailProvider.send(MESSAGE);

		assert.deepEqual(InMemoryMailModel.outbox, [MESSAGE]);
		InMemoryMailModel.outbox.length = 0;
	});
});
