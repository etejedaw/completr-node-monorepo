import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { ServiceError } from "../../src/common/errors/service-error";
import {
	DeepseekClient,
	DeepseekProvider,
	DisabledDeepseekProvider
} from "../../src/ia/deepseek/deepseek.provider";
import { captureRejection } from "../unit-helpers/mocks";

const SETTINGS = { apiKey: "fake-key", model: "fake-model", timeoutMs: 5000 };
const REQUEST = { instructions: "Summarize.", content: "Played 3 games." };

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" }
	});
}

function completion(content: unknown, finishReason = "stop") {
	return {
		choices: [
			{
				finish_reason: finishReason,
				message: { role: "assistant", content }
			}
		]
	};
}

function stubFetch(implementation: () => Promise<Response>) {
	return mock.method(globalThis, "fetch", implementation as typeof fetch);
}

function sentBody(fetchMock: ReturnType<typeof stubFetch>) {
	const init = fetchMock.mock.calls[0]?.arguments[1] as RequestInit;
	return JSON.parse(String(init.body)) as Record<string, unknown>;
}

async function assertRejectsWith(promise: Promise<unknown>, code: string) {
	const error = await captureRejection(promise);
	assert.ok(error instanceof ServiceError);
	assert.equal(error.code, code);
	assert.equal(error.serviceError.service, "IA Provider");
	return error;
}

afterEach(() => {
	mock.restoreAll();
});

void describe("DeepseekClient.create", () => {
	void it("returns a DisabledDeepseekProvider without an API key", () => {
		const client = DeepseekClient.create({
			...SETTINGS,
			apiKey: undefined
		});

		assert.ok(client instanceof DisabledDeepseekProvider);
		assert.equal(client.isEnabled, false);
	});

	void it("returns a DisabledDeepseekProvider with an empty API key", () => {
		const client = DeepseekClient.create({ ...SETTINGS, apiKey: "" });

		assert.ok(client instanceof DisabledDeepseekProvider);
	});

	void it("returns a DeepseekProvider with an API key", () => {
		const client = DeepseekClient.create(SETTINGS);

		assert.ok(client instanceof DeepseekProvider);
		assert.equal(client.isEnabled, true);
	});
});

void describe("DisabledDeepseekProvider", () => {
	void it("rejects with IA_NOT_CONFIGURED without calling fetch", async () => {
		const fetchMock = stubFetch(async () => jsonResponse({}));

		await assertRejectsWith(
			new DisabledDeepseekProvider().generateText(),
			"IA_NOT_CONFIGURED"
		);
		assert.equal(fetchMock.mock.callCount(), 0);
	});
});

void describe("DeepseekProvider.generateText", () => {
	void it("sends an authenticated chat completion request", async () => {
		const fetchMock = stubFetch(async () => jsonResponse(completion("Hi")));

		await new DeepseekProvider(SETTINGS).generateText({
			...REQUEST,
			maxTokens: 200,
			temperature: 0.4
		});

		const [url, init] = fetchMock.mock.calls[0]?.arguments as [
			string,
			RequestInit
		];
		assert.equal(url, "https://api.deepseek.com/chat/completions");
		assert.equal(init.method, "POST");
		assert.equal(
			(init.headers as Record<string, string>).Authorization,
			"Bearer fake-key"
		);
		assert.deepEqual(sentBody(fetchMock), {
			model: "fake-model",
			messages: [
				{ role: "system", content: "Summarize." },
				{ role: "user", content: "Played 3 games." }
			],
			thinking: { type: "disabled" },
			stream: false,
			max_tokens: 200,
			temperature: 0.4
		});
	});

	void it("omits max_tokens and temperature when not given", async () => {
		const fetchMock = stubFetch(async () => jsonResponse(completion("Hi")));

		await new DeepseekProvider(SETTINGS).generateText(REQUEST);

		const body = sentBody(fetchMock);
		assert.equal("max_tokens" in body, false);
		assert.equal("temperature" in body, false);
	});

	void it("returns the trimmed text", async () => {
		stubFetch(async () => jsonResponse(completion("  Great year.\n")));

		const result = await new DeepseekProvider(SETTINGS).generateText(
			REQUEST
		);

		assert.deepEqual(result, { text: "Great year.", truncated: false });
	});

	void it("flags a response cut by the token limit", async () => {
		stubFetch(async () => jsonResponse(completion("Half a", "length")));

		const result = await new DeepseekProvider(SETTINGS).generateText(
			REQUEST
		);

		assert.equal(result.truncated, true);
	});

	void it("keeps emoji and HTML in the content untouched", async () => {
		const text = "<b>Épico</b> 🎮 & más \u0000 ñ";
		const fetchMock = stubFetch(async () => jsonResponse(completion(text)));

		const result = await new DeepseekProvider(SETTINGS).generateText({
			instructions: "<script>alert(1)</script> 🎮",
			content: "👾 <img src=x onerror=1>"
		});

		assert.equal(result.text, text.trim());
		assert.deepEqual(sentBody(fetchMock).messages, [
			{ role: "system", content: "<script>alert(1)</script> 🎮" },
			{ role: "user", content: "👾 <img src=x onerror=1>" }
		]);
	});

	for (const status of [400, 401, 402, 422, 429, 500, 503]) {
		void it(`rejects with IA_PROVIDER_UNAVAILABLE on HTTP ${status}`, async () => {
			stubFetch(async () =>
				jsonResponse({ error: { message: "secret detail" } }, status)
			);

			const error = await assertRejectsWith(
				new DeepseekProvider(SETTINGS).generateText(REQUEST),
				"IA_PROVIDER_UNAVAILABLE"
			);
			assert.match(
				String(error.serviceError.raw),
				new RegExp(`${status}`)
			);
			assert.doesNotMatch(String(error.serviceError.raw), /fake-key/);
		});
	}

	void it("rejects with IA_PROVIDER_UNAVAILABLE when the network fails", async () => {
		stubFetch(async () => {
			throw new TypeError("fetch failed");
		});

		await assertRejectsWith(
			new DeepseekProvider(SETTINGS).generateText(REQUEST),
			"IA_PROVIDER_UNAVAILABLE"
		);
	});

	void it("rejects with IA_TIMEOUT when the request is aborted by the timeout", async () => {
		stubFetch(async () => {
			throw new DOMException("timed out", "TimeoutError");
		});

		await assertRejectsWith(
			new DeepseekProvider(SETTINGS).generateText(REQUEST),
			"IA_TIMEOUT"
		);
	});

	void it("rejects with IA_TIMEOUT for a real hanging request", async () => {
		mock.method(
			globalThis,
			"fetch",
			((_url: string, init: RequestInit) =>
				new Promise((_resolve, reject) => {
					init.signal?.addEventListener("abort", () =>
						reject(init.signal?.reason)
					);
				})) as unknown as typeof fetch
		);

		await assertRejectsWith(
			new DeepseekProvider(SETTINGS).generateText({
				...REQUEST,
				timeoutMs: 20
			}),
			"IA_TIMEOUT"
		);
	});

	void it("uses the per-request timeout over the configured one", async () => {
		const timeoutSpy = mock.method(AbortSignal, "timeout");
		stubFetch(async () => jsonResponse(completion("Hi")));

		await new DeepseekProvider(SETTINGS).generateText({
			...REQUEST,
			timeoutMs: 1234
		});

		assert.equal(timeoutSpy.mock.calls[0]?.arguments[0], 1234);
	});

	void it("uses the configured timeout by default", async () => {
		const timeoutSpy = mock.method(AbortSignal, "timeout");
		stubFetch(async () => jsonResponse(completion("Hi")));

		await new DeepseekProvider(SETTINGS).generateText(REQUEST);

		assert.equal(timeoutSpy.mock.calls[0]?.arguments[0], 5000);
	});

	void it("rejects with IA_INVALID_RESPONSE when the body is not JSON", async () => {
		stubFetch(
			async () => new Response("<html>gateway</html>", { status: 200 })
		);

		await assertRejectsWith(
			new DeepseekProvider(SETTINGS).generateText(REQUEST),
			"IA_INVALID_RESPONSE"
		);
	});

	const invalidBodies: [string, unknown][] = [
		["null", null],
		["an empty object", {}],
		["no choices", { choices: [] }],
		["a choice without message", { choices: [{}] }],
		["null content", completion(null)],
		["empty content", completion("")],
		["blank content", completion("  \n\t ")],
		["non-string content", completion(42)],
		["a content filter stop", completion("", "content_filter")]
	];

	for (const [label, body] of invalidBodies) {
		void it(`rejects with IA_INVALID_RESPONSE on ${label}`, async () => {
			stubFetch(async () => jsonResponse(body));

			await assertRejectsWith(
				new DeepseekProvider(SETTINGS).generateText(REQUEST),
				"IA_INVALID_RESPONSE"
			);
		});
	}

	void it("serves concurrent calls independently", async () => {
		let calls = 0;
		stubFetch(async () => {
			calls += 1;
			return calls === 2
				? jsonResponse({}, 500)
				: jsonResponse(completion(`ok ${calls}`));
		});
		const provider = new DeepseekProvider(SETTINGS);

		const results = await Promise.allSettled([
			provider.generateText(REQUEST),
			provider.generateText(REQUEST),
			provider.generateText(REQUEST)
		]);

		assert.deepEqual(
			results.map(result => result.status),
			["fulfilled", "rejected", "fulfilled"]
		);
	});
});
