import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { ServiceError } from "../../src/common/errors/service-error";
import * as iaService from "../../src/ia/ia.service";
import { captureRejection } from "../unit-helpers/mocks";

const VALID = { instructions: "Summarize.", content: "Played 3 games." };

afterEach(() => {
	mock.restoreAll();
});

void describe("ia service without DEEPSEEK_API_KEY", () => {
	void it("reports AI as not configured", () => {
		assert.equal(iaService.isIaConfigured(), false);
	});

	void it("rejects generateText with IA_NOT_CONFIGURED without calling the network", async () => {
		const fetchMock = mock.method(
			globalThis,
			"fetch",
			(async () => new Response("{}")) as typeof fetch
		);

		const error = await captureRejection(iaService.generateText(VALID));

		assert.ok(error instanceof ServiceError);
		assert.equal(error.code, "IA_NOT_CONFIGURED");
		assert.equal(fetchMock.mock.callCount(), 0);
	});

	void it("does not reject repeated calls differently (double clicks)", async () => {
		const results = await Promise.allSettled([
			iaService.generateText(VALID),
			iaService.generateText(VALID),
			iaService.generateText(VALID)
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

void describe("ia service input validation", () => {
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
				iaService.generateText({ ...VALID, ...override })
			);

			assert.ok(error instanceof ServiceError);
			assert.equal(error.code, "IA_INVALID_INPUT");
			assert.equal(fetchMock.mock.callCount(), 0);
		});
	}
});
