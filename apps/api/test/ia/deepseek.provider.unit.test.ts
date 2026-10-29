import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import z from "zod";

import { ServiceError } from "../../src/common/errors/service-error";
import {
	DeepseekModel,
	DeepseekProvider,
	DisabledDeepseekProvider
} from "../../src/ia/deepseek/deepseek.provider";
import { captureRejection } from "../unit-helpers/mocks";
import {
	API_KEY,
	completion,
	hangingFetch,
	jsonResponse,
	replyWith,
	responsesBody,
	scriptedFetch,
	sentBody,
	sentCall,
	sentHeader
} from "./deepseek-fakes";

const REQUEST = { instructions: "Summarize.", content: "Played 3 games." };

const CardSchema = z
	.object({ title: z.string().trim().min(1).max(10) })
	.strict();

const JSON_REQUEST = {
	...REQUEST,
	schemaName: "game_card",
	schema: CardSchema
};

async function assertRejectsWith(promise: Promise<unknown>, code: string) {
	const error = await captureRejection(promise);
	assert.ok(error instanceof ServiceError, String(error));
	assert.equal(error.code, code);
	assert.equal(error.serviceError.service, "IA Provider");
	return error;
}

afterEach(() => {
	mock.restoreAll();
});

void describe("DeepseekModel.create", () => {
	void it("returns a DisabledDeepseekProvider without an API key", () => {
		const client = DeepseekModel.create(undefined);

		assert.ok(client instanceof DisabledDeepseekProvider);
		assert.equal(client.isEnabled, false);
	});

	void it("returns a DisabledDeepseekProvider with an empty API key", () => {
		assert.ok(DeepseekModel.create("") instanceof DisabledDeepseekProvider);
	});

	void it("returns a DeepseekProvider with an API key", () => {
		const client = DeepseekModel.create(API_KEY);

		assert.ok(client instanceof DeepseekProvider);
		assert.equal(client.isEnabled, true);
	});
});

void describe("DisabledDeepseekProvider", () => {
	void it("rejects both generations with IA_NOT_CONFIGURED without calling fetch", async () => {
		const fetchMock = mock.method(globalThis, "fetch", (async () =>
			jsonResponse({})) as typeof fetch);
		const provider = new DisabledDeepseekProvider();

		await assertRejectsWith(provider.generateText(), "IA_NOT_CONFIGURED");
		await assertRejectsWith(provider.generateJson(), "IA_NOT_CONFIGURED");
		assert.equal(fetchMock.mock.callCount(), 0);
	});
});

void describe("DeepseekProvider.generateText", () => {
	void it("sends an authenticated chat completion request", async () => {
		const fetchMock = replyWith(jsonResponse(completion("Hi")));

		await new DeepseekProvider(API_KEY, fetchMock).generateText({
			...REQUEST,
			maxTokens: 200,
			temperature: 0.4
		});

		const { url, init } = sentCall(fetchMock);
		assert.equal(url, "https://api.deepseek.com/chat/completions");
		assert.equal(init.method, "POST");
		assert.equal(sentHeader(fetchMock, "authorization"), "Bearer fake-key");
		assert.deepEqual(sentBody(fetchMock), {
			model: "deepseek-flash",
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
		const fetchMock = replyWith(jsonResponse(completion("Hi")));

		await new DeepseekProvider(API_KEY, fetchMock).generateText(REQUEST);

		const body = sentBody(fetchMock);
		assert.equal("max_tokens" in body, false);
		assert.equal("temperature" in body, false);
	});

	void it("returns the trimmed text", async () => {
		const fetchMock = replyWith(
			jsonResponse(completion("  Great year.\n"))
		);

		const result = await new DeepseekProvider(
			API_KEY,
			fetchMock
		).generateText(REQUEST);

		assert.deepEqual(result, { text: "Great year.", truncated: false });
	});

	void it("flags a response cut by the token limit", async () => {
		const fetchMock = replyWith(
			jsonResponse(completion("Half a", "length"))
		);

		const result = await new DeepseekProvider(
			API_KEY,
			fetchMock
		).generateText(REQUEST);

		assert.equal(result.truncated, true);
	});

	void it("keeps emoji and HTML in the content untouched", async () => {
		const text = "<b>Épico</b> 🎮 & más \u0000 ñ";
		const fetchMock = replyWith(jsonResponse(completion(text)));

		const result = await new DeepseekProvider(
			API_KEY,
			fetchMock
		).generateText({
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
		void it(`rejects with IA_PROVIDER_UNAVAILABLE on HTTP ${status} without retrying`, async () => {
			const fetchMock = replyWith(
				jsonResponse({ error: { message: "upstream detail" } }, status)
			);

			const error = await assertRejectsWith(
				new DeepseekProvider(API_KEY, fetchMock).generateText(REQUEST),
				"IA_PROVIDER_UNAVAILABLE"
			);

			assert.equal(fetchMock.mock.callCount(), 1);
			assert.match(
				String(error.serviceError.raw),
				new RegExp(`${status}`)
			);
			assert.doesNotMatch(String(error.serviceError.raw), /fake-key/);
		});
	}

	void it("rejects with IA_PROVIDER_UNAVAILABLE when the network fails", async () => {
		const fetchMock = scriptedFetch(() => {
			throw new TypeError("fetch failed");
		});

		await assertRejectsWith(
			new DeepseekProvider(API_KEY, fetchMock).generateText(REQUEST),
			"IA_PROVIDER_UNAVAILABLE"
		);
		assert.equal(fetchMock.mock.callCount(), 1);
	});

	void it("rejects with IA_TIMEOUT for a hanging request", async () => {
		const fetchMock = hangingFetch();

		await assertRejectsWith(
			new DeepseekProvider(API_KEY, fetchMock).generateText({
				...REQUEST,
				timeoutMs: 20
			}),
			"IA_TIMEOUT"
		);
		assert.equal(fetchMock.mock.callCount(), 1);
	});

	void it("rejects with IA_INVALID_RESPONSE when the body is not JSON", async () => {
		const fetchMock = replyWith(
			new Response("<html>gateway</html>", {
				status: 200,
				headers: { "content-type": "text/html" }
			})
		);

		await assertRejectsWith(
			new DeepseekProvider(API_KEY, fetchMock).generateText(REQUEST),
			"IA_INVALID_RESPONSE"
		);
	});

	void it("rejects with IA_INVALID_RESPONSE when a JSON body is malformed", async () => {
		const fetchMock = replyWith(
			new Response("{not json", {
				status: 200,
				headers: { "content-type": "application/json" }
			})
		);

		await assertRejectsWith(
			new DeepseekProvider(API_KEY, fetchMock).generateText(REQUEST),
			"IA_INVALID_RESPONSE"
		);
	});

	const invalidBodies: [string, unknown][] = [
		["null", null],
		["an empty object", {}],
		["no choices", { choices: [] }],
		["non-array choices", { choices: "nope" }],
		["a choice without message", { choices: [{}] }],
		["null content", completion(null)],
		["empty content", completion("")],
		["blank content", completion("  \n\t ")],
		["non-string content", completion(42)],
		["a content filter stop", completion("", "content_filter")]
	];

	for (const [label, body] of invalidBodies) {
		void it(`rejects with IA_INVALID_RESPONSE on ${label}`, async () => {
			const fetchMock = replyWith(jsonResponse(body));

			await assertRejectsWith(
				new DeepseekProvider(API_KEY, fetchMock).generateText(REQUEST),
				"IA_INVALID_RESPONSE"
			);
		});
	}

	void it("serves concurrent calls independently", async () => {
		let calls = 0;
		const fetchMock = scriptedFetch(() => {
			calls += 1;
			return calls === 2
				? jsonResponse({}, 500)
				: jsonResponse(completion(`ok ${calls}`));
		});
		const provider = new DeepseekProvider(API_KEY, fetchMock);

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

void describe("DeepseekProvider.generateJson", () => {
	void it("sends a structured output request to the responses endpoint", async () => {
		const fetchMock = replyWith(
			jsonResponse(responsesBody('{"title":"A"}'))
		);

		await new DeepseekProvider(API_KEY, fetchMock).generateJson({
			...JSON_REQUEST,
			maxTokens: 300,
			temperature: 0.8
		});

		const { url } = sentCall(fetchMock);
		assert.equal(url, "https://api.deepseek.com/responses");
		assert.equal(sentHeader(fetchMock, "authorization"), "Bearer fake-key");
		assert.deepEqual(sentBody(fetchMock), {
			model: "deepseek-flash",
			instructions: "Summarize.",
			input: "Played 3 games.",
			reasoning: { effort: "none" },
			text: {
				format: {
					type: "json_schema",
					name: "game_card",
					strict: true,
					schema: {
						$schema: "http://json-schema.org/draft-07/schema#",
						type: "object",
						properties: {
							title: {
								type: "string",
								minLength: 1,
								maxLength: 10
							}
						},
						required: ["title"],
						additionalProperties: false
					}
				}
			},
			stream: false,
			max_output_tokens: 300,
			temperature: 0.8
		});
	});

	void it("returns the raw trimmed text for the caller to validate", async () => {
		const fetchMock = replyWith(
			jsonResponse(
				responsesBody('  {"title":"too long for the schema"}\n')
			)
		);

		const result = await new DeepseekProvider(
			API_KEY,
			fetchMock
		).generateJson(JSON_REQUEST);

		assert.deepEqual(result, {
			text: '{"title":"too long for the schema"}',
			truncated: false
		});
	});

	void it("flags an incomplete response as truncated", async () => {
		const fetchMock = replyWith(
			jsonResponse(responsesBody('{"title":"A', "incomplete"))
		);

		const result = await new DeepseekProvider(
			API_KEY,
			fetchMock
		).generateJson(JSON_REQUEST);

		assert.deepEqual(result, { text: '{"title":"A', truncated: true });
	});

	for (const status of [401, 429, 500]) {
		void it(`rejects with IA_PROVIDER_UNAVAILABLE on HTTP ${status} without retrying`, async () => {
			const fetchMock = replyWith(
				jsonResponse({ error: { message: "nope" } }, status)
			);

			const error = await assertRejectsWith(
				new DeepseekProvider(API_KEY, fetchMock).generateJson(
					JSON_REQUEST
				),
				"IA_PROVIDER_UNAVAILABLE"
			);

			assert.equal(fetchMock.mock.callCount(), 1);
			assert.match(
				String(error.serviceError.raw),
				new RegExp(`${status}`)
			);
		});
	}

	void it("rejects with IA_PROVIDER_UNAVAILABLE on a connection error", async () => {
		const fetchMock = scriptedFetch(() => {
			throw new TypeError("ECONNRESET");
		});

		await assertRejectsWith(
			new DeepseekProvider(API_KEY, fetchMock).generateJson(JSON_REQUEST),
			"IA_PROVIDER_UNAVAILABLE"
		);
	});

	void it("rejects with IA_TIMEOUT for a hanging request", async () => {
		await assertRejectsWith(
			new DeepseekProvider(API_KEY, hangingFetch()).generateJson({
				...JSON_REQUEST,
				timeoutMs: 20
			}),
			"IA_TIMEOUT"
		);
	});

	const emptyBodies: [string, unknown][] = [
		["null", null],
		["an empty object", {}],
		["an empty output", { status: "completed", output: [] }],
		["a message without content", { output: [{ type: "message" }] }],
		["a non-array output", { output: "text" }],
		["blank text", responsesBody("  \n ")],
		[
			"a non-string text",
			{
				output: [
					{
						type: "message",
						content: [{ type: "output_text", text: 42 }]
					}
				]
			}
		],
		["an empty incomplete response", responsesBody("", "incomplete")]
	];

	for (const [label, body] of emptyBodies) {
		void it(`rejects with IA_INVALID_RESPONSE on ${label}`, async () => {
			await assertRejectsWith(
				new DeepseekProvider(
					API_KEY,
					replyWith(jsonResponse(body))
				).generateJson(JSON_REQUEST),
				"IA_INVALID_RESPONSE"
			);
		});
	}
});
