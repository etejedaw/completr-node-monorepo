import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import nodemailer from "nodemailer";

import { ServiceError } from "../../src/common/errors/service-error";
import { type MailMessage } from "../../src/mail/mail.interface";
import { type NodemailerSettings } from "../../src/mail/nodemailer/nodemailer.interface";
import {
	DisabledNodemailerProvider,
	NodemailerModel,
	NodemailerProvider
} from "../../src/mail/nodemailer/nodemailer.provider";
import { captureRejection } from "../unit-helpers/mocks";

const SETTINGS: NodemailerSettings = {
	host: "smtp.example.com",
	port: 587,
	secure: false,
	user: "user",
	password: "secret",
	from: "Completr <completr@example.com>"
};

const MESSAGE: MailMessage = {
	to: "p@example.com",
	subject: "Reset",
	text: "Hello",
	html: "<p>Hello</p>"
};

function mockTransport(sendMail: (mail: unknown) => Promise<unknown>) {
	return mock.method(
		nodemailer,
		"createTransport",
		() =>
			({ sendMail }) as unknown as ReturnType<
				typeof nodemailer.createTransport
			>
	);
}

afterEach(() => {
	mock.restoreAll();
});

void describe("NodemailerModel.create", () => {
	void it("returns a disabled provider without a host", () => {
		const model = NodemailerModel.create({ ...SETTINGS, host: undefined });

		assert.ok(model instanceof DisabledNodemailerProvider);
		assert.equal(model.isEnabled, false);
	});

	void it("returns an enabled SMTP provider with a host", () => {
		mockTransport(async () => ({}));

		const model = NodemailerModel.create(SETTINGS);

		assert.ok(model instanceof NodemailerProvider);
		assert.equal(model.isEnabled, true);
	});
});

void describe("NodemailerProvider", () => {
	void it("sends with the configured sender and the message fields", async () => {
		const sent: unknown[] = [];
		mockTransport(async mail => {
			sent.push(mail);
			return {};
		});

		await NodemailerModel.create(SETTINGS).send(MESSAGE);

		assert.deepEqual(sent, [{ from: SETTINGS.from, ...MESSAGE }]);
	});

	void it("wraps a transport failure in MAIL_SEND_ERROR", async () => {
		mockTransport(async () => {
			throw new Error("connection refused");
		});

		const error = await captureRejection(
			NodemailerModel.create(SETTINGS).send(MESSAGE)
		);

		assert.ok(error instanceof ServiceError);
		assert.equal(error.code, "MAIL_SEND_ERROR");
	});
});

void describe("DisabledNodemailerProvider", () => {
	void it("rejects every send with MAIL_DISABLED", async () => {
		const model = new DisabledNodemailerProvider();

		const results = await Promise.allSettled([model.send(), model.send()]);

		for (const result of results) {
			assert.equal(result.status, "rejected");
			assert.equal(
				(result as PromiseRejectedResult).reason.code,
				"MAIL_DISABLED"
			);
		}
	});
});
