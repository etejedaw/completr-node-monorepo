import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { ServiceError } from "../../src/common/errors/service-error";
import {
	type GenerateTextRequest,
	type GenerateTextResult,
	type IaModel
} from "../../src/ia/ia.interface";
import { IaProvider, iaProvider } from "../../src/ia/ia.provider";
import { captureRejection } from "../unit-helpers/mocks";

const VALID = { instructions: "Summarize.", content: "Played 3 games." };

afterEach(() => {
	mock.restoreAll();
});

void describe("ia provider without DEEPSEEK_API_KEY", () => {
	void it("reports AI as not configured", () => {
		assert.equal(iaProvider.isConfigured, false);
	});

	void it("rejects generateText with IA_NOT_CONFIGURED without calling the network", async () => {
		const fetchMock = mock.method(
			globalThis,
			"fetch",
			(async () => new Response("{}")) as typeof fetch
		);

		const error = await captureRejection(iaProvider.generateText(VALID));

		assert.ok(error instanceof ServiceError);
		assert.equal(error.code, "IA_NOT_CONFIGURED");
		assert.equal(fetchMock.mock.callCount(), 0);
	});

	void it("does not reject repeated calls differently (double clicks)", async () => {
		const results = await Promise.allSettled([
			iaProvider.generateText(VALID),
			iaProvider.generateText(VALID),
			iaProvider.generateText(VALID)
		]);

		for (const result of results) {
			assert.equal(result.status, "rejected");
			assert.equal(
				(result as PromiseRejectedResult).reason.code,
				"IA_NOT_CONFIGURED"
			);
		}
	});
});

void describe("ia provider input validation", () => {
	const invalidRequests: [string, Record<string, unknown>][] = [
		["blank instructions", { instructions: "   " }],
		["empty content", { content: "" }],
		["whitespace content", { content: " \n\t" }],
		["zero maxTokens", { maxTokens: 0 }],
		["negative maxTokens", { maxTokens: -5 }],
		["fractional maxTokens", { maxTokens: 1.5 }],
		["NaN maxTokens", { maxTokens: Number.NaN }],
		["huge infinite maxTokens", { maxTokens: Infinity }],
		["negative temperature", { temperature: -0.1 }],
		["temperature above 2", { temperature: 2.1 }],
		["NaN temperature", { temperature: Number.NaN }],
		["zero timeoutMs", { timeoutMs: 0 }],
		["negative timeoutMs", { timeoutMs: -1 }]
	];

	for (const [label, override] of invalidRequests) {
		void it(`rejects ${label} with IA_INVALID_INPUT`, async () => {
			const fetchMock = mock.method(
				globalThis,
				"fetch",
				(async () => new Response("{}")) as typeof fetch
			);

			const error = await captureRejection(
				iaProvider.generateText({ ...VALID, ...override })
			);

			assert.ok(error instanceof ServiceError);
			assert.equal(error.code, "IA_INVALID_INPUT");
			assert.equal(fetchMock.mock.callCount(), 0);
		});
	}
});

class FakeIaModel implements IaModel {
	readonly requests: GenerateTextRequest[] = [];

	constructor(readonly isEnabled: boolean) {}

	async generateText(
		request: GenerateTextRequest
	): Promise<GenerateTextResult> {
		this.requests.push(request);
		return await Promise.resolve({
			text: `reply to ${request.content}`,
			truncated: false
		});
	}
}

void describe("ia provider with an injected model", () => {
	void it("reports the model state as configured", () => {
		assert.equal(new IaProvider(new FakeIaModel(true)).isConfigured, true);
		assert.equal(
			new IaProvider(new FakeIaModel(false)).isConfigured,
			false
		);
	});

	void it("delegates trimmed input to the model it was built with", async () => {
		const model = new FakeIaModel(true);
		const provider = new IaProvider(model);

		const result = await provider.generateText({
			instructions: "  Summarize. ",
			content: " Played <b>3</b> games 👾 ",
			temperature: 0.4
		});

		assert.deepEqual(result, {
			text: "reply to Played <b>3</b> games 👾",
			truncated: false
		});
		assert.deepEqual(model.requests, [
			{
				instructions: "Summarize.",
				content: "Played <b>3</b> games 👾",
				temperature: 0.4
			}
		]);
	});

	void it("never reaches the model with invalid input", async () => {
		const model = new FakeIaModel(true);
		const provider = new IaProvider(model);

		const error = await captureRejection(
			provider.generateText({ ...VALID, content: "   " })
		);

		assert.ok(error instanceof ServiceError);
		assert.equal(error.code, "IA_INVALID_INPUT");
		assert.equal(model.requests.length, 0);
	});

	void it("handles repeated concurrent calls independently", async () => {
		const model = new FakeIaModel(true);
		const provider = new IaProvider(model);

		const results = await Promise.all([
			provider.generateText({ ...VALID, content: "one" }),
			provider.generateText({ ...VALID, content: "two" }),
			provider.generateText({ ...VALID, content: "one" })
		]);

		assert.deepEqual(
			results.map(result => result.text),
			["reply to one", "reply to two", "reply to one"]
		);
		assert.equal(model.requests.length, 3);
	});
});
