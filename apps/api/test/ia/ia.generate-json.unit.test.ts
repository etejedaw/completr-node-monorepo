import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import z from "zod";

import { ServiceError } from "../../src/common/errors/service-error";
import {
	DeepseekProvider,
	DisabledDeepseekProvider
} from "../../src/ia/deepseek/deepseek.provider";
import { IaProvider, iaProvider } from "../../src/ia/ia.provider";
import { captureRejection } from "../unit-helpers/mocks";
import {
	API_KEY,
	hangingFetch,
	jsonResponse,
	replyWith,
	responsesBody,
	scriptedFetch,
	sentBody
} from "./deepseek-fakes";

const CardSchema = z
	.object({
		title: z.string().trim().min(1).max(10),
		mood: z.enum(["happy", "calm"]),
		tags: z.array(z.string()).length(2)
	})
	.strict();

const REQUEST = {
	instructions: "Reply with a JSON card.",
	content: "Played 3 games.",
	schemaName: "game_card"
};

const VALID_CARD = { title: "Cozy", mood: "calm", tags: ["a", "b"] };

function providerOver(fetchImplementation: typeof fetch) {
	return new IaProvider(new DeepseekProvider(API_KEY, fetchImplementation));
}

function failureReasons(error: ServiceError): string[] {
	return (error.serviceError.raw as { failures: string[] }).failures;
}

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

void describe("iaProvider.generateJson over DeepSeek", () => {
	void it("sends trimmed input and the schema as a strict json_schema format", async () => {
		const fetchMock = replyWith(
			jsonResponse(responsesBody(JSON.stringify(VALID_CARD)))
		);

		await providerOver(fetchMock).generateJson(CardSchema, {
			...REQUEST,
			instructions: "  Reply with a JSON card. ",
			content: " Played 3 games.\n",
			schemaName: " game_card ",
			maxTokens: 300,
			temperature: 0.8
		});

		const body = sentBody(fetchMock) as {
			instructions: string;
			input: string;
			text: { format: Record<string, unknown> };
		};
		assert.equal(body.instructions, "Reply with a JSON card.");
		assert.equal(body.input, "Played 3 games.");
		assert.equal(body.text.format.name, "game_card");
		assert.equal(body.text.format.strict, true);
		assert.deepEqual(
			(body.text.format.schema as { required: string[] }).required,
			["title", "mood", "tags"]
		);
	});

	void it("returns the parsed and validated JSON", async () => {
		const fetchMock = replyWith(
			jsonResponse(
				responsesBody(
					`  ${JSON.stringify({ ...VALID_CARD, title: "  Cozy  " })}\n`
				)
			)
		);

		const card = await providerOver(fetchMock).generateJson(
			CardSchema,
			REQUEST
		);

		assert.deepEqual(card, VALID_CARD);
		assert.equal(fetchMock.mock.callCount(), 1);
	});

	void it("joins text split across several output parts", async () => {
		const text = JSON.stringify(VALID_CARD);
		const fetchMock = replyWith(
			jsonResponse({
				status: "completed",
				output: [
					{ type: "reasoning", summary: [] },
					{
						type: "message",
						content: [
							{ type: "output_text", text: text.slice(0, 7) },
							{ type: "refusal", refusal: "ignored" },
							{ type: "output_text", text: text.slice(7) }
						]
					}
				]
			})
		);

		const card = await providerOver(fetchMock).generateJson(
			CardSchema,
			REQUEST
		);

		assert.deepEqual(card, VALID_CARD);
	});

	void it("keeps emoji, quotes and HTML inside string values", async () => {
		const tricky = {
			title: '"🎮"<b>',
			mood: "happy",
			tags: ["<script>", "a\nb"]
		};
		const fetchMock = replyWith(
			jsonResponse(responsesBody(JSON.stringify(tricky)))
		);

		const card = await providerOver(fetchMock).generateJson(
			CardSchema,
			REQUEST
		);

		assert.deepEqual(card, tricky);
	});

	void it("retries once when the first output is broken JSON", async () => {
		const fetchMock = replyWith(
			jsonResponse(responsesBody('{"title": "Coz')),
			jsonResponse(responsesBody(JSON.stringify(VALID_CARD)))
		);

		const card = await providerOver(fetchMock).generateJson(
			CardSchema,
			REQUEST
		);

		assert.deepEqual(card, VALID_CARD);
		assert.equal(fetchMock.mock.callCount(), 2);
		const { instructions: firstInstructions, ...firstRest } = sentBody(
			fetchMock,
			0
		);
		const { instructions: retryInstructions, ...retryRest } = sentBody(
			fetchMock,
			1
		);
		assert.deepEqual(retryRest, firstRest);
		assert.match(String(firstInstructions), /^((?!previous reply).)*$/s);
		assert.match(
			String(retryInstructions),
			/Your previous reply was rejected because output is not valid JSON/
		);
	});

	void it("recovers on the third attempt and only reports the last rejection", async () => {
		const fetchMock = replyWith(
			jsonResponse(responsesBody("not json")),
			jsonResponse(
				responsesBody(
					JSON.stringify({
						...VALID_CARD,
						title: "Way too long title"
					})
				)
			),
			jsonResponse(responsesBody(JSON.stringify(VALID_CARD)))
		);

		const card = await providerOver(fetchMock).generateJson(
			CardSchema,
			REQUEST
		);

		assert.deepEqual(card, VALID_CARD);
		assert.equal(fetchMock.mock.callCount(), 3);
		const lastInstructions = String(sentBody(fetchMock, 2).instructions);
		assert.match(lastInstructions, /does not match the schema/);
		assert.doesNotMatch(lastInstructions, /is not valid JSON/);
	});

	void it("merges an output the model split into two JSON objects", async () => {
		const [headline, rest] = [
			{ title: VALID_CARD.title },
			Object.fromEntries(
				Object.entries(VALID_CARD).filter(([key]) => key !== "title")
			)
		];
		const fetchMock = replyWith(
			jsonResponse(
				responsesBody(
					`${JSON.stringify(headline)}\n${JSON.stringify(rest)}`
				)
			)
		);

		const card = await providerOver(fetchMock).generateJson(
			CardSchema,
			REQUEST
		);

		assert.deepEqual(card, VALID_CARD);
		assert.equal(fetchMock.mock.callCount(), 1);
	});

	void it("rejects with IA_INVALID_OUTPUT when the JSON is broken on every attempt", async () => {
		const fetchMock = replyWith(
			jsonResponse(responsesBody("not json at all"))
		);

		const error = await assertRejectsWith(
			providerOver(fetchMock).generateJson(CardSchema, REQUEST),
			"IA_INVALID_OUTPUT"
		);

		assert.equal(fetchMock.mock.callCount(), 3);
		assert.deepEqual(error.serviceError.raw, {
			schemaName: "game_card",
			failures: [
				"output is not valid JSON",
				"output is not valid JSON",
				"output is not valid JSON"
			]
		});
	});

	void it("does not leak the raw model output in the error", async () => {
		const fetchMock = replyWith(
			jsonResponse(responsesBody('{"secret": "user diary"}'))
		);

		const error = await assertRejectsWith(
			providerOver(fetchMock).generateJson(CardSchema, REQUEST),
			"IA_INVALID_OUTPUT"
		);

		assert.doesNotMatch(
			JSON.stringify(error.serviceError.raw),
			/user diary/
		);
	});

	const invalidOutputs: [string, unknown][] = [
		["a missing field", { title: "Cozy", mood: "calm" }],
		["an extra field", { ...VALID_CARD, extra: true }],
		["a value outside the enum", { ...VALID_CARD, mood: "angry" }],
		["a wrong type", { ...VALID_CARD, tags: "a,b" }],
		["too many items", { ...VALID_CARD, tags: ["a", "b", "c"] }],
		[
			"a string longer than allowed",
			{ ...VALID_CARD, title: "x".repeat(11) }
		],
		["a blank string", { ...VALID_CARD, title: "   " }],
		["an array instead of an object", [VALID_CARD]],
		["a bare string", "Cozy"],
		["null", null]
	];

	for (const [label, output] of invalidOutputs) {
		void it(`retries and then rejects with IA_INVALID_OUTPUT on ${label}`, async () => {
			const fetchMock = replyWith(
				jsonResponse(responsesBody(JSON.stringify(output)))
			);

			const error = await assertRejectsWith(
				providerOver(fetchMock).generateJson(CardSchema, REQUEST),
				"IA_INVALID_OUTPUT"
			);

			assert.equal(fetchMock.mock.callCount(), 3);
			assert.match(
				failureReasons(error)[0] ?? "",
				/does not match the schema/
			);
		});
	}

	void it("recovers when only the first output is too long", async () => {
		const fetchMock = replyWith(
			jsonResponse(
				responsesBody(
					JSON.stringify({
						...VALID_CARD,
						title: "Way too long title"
					})
				)
			),
			jsonResponse(responsesBody(JSON.stringify(VALID_CARD)))
		);

		const card = await providerOver(fetchMock).generateJson(
			CardSchema,
			REQUEST
		);

		assert.deepEqual(card, VALID_CARD);
		assert.equal(fetchMock.mock.callCount(), 2);
	});

	void it("retries an incomplete response even if its text parses", async () => {
		const fetchMock = replyWith(
			jsonResponse(
				responsesBody(JSON.stringify(VALID_CARD), "incomplete")
			),
			jsonResponse(responsesBody(JSON.stringify(VALID_CARD)))
		);

		const card = await providerOver(fetchMock).generateJson(
			CardSchema,
			REQUEST
		);

		assert.deepEqual(card, VALID_CARD);
		assert.equal(fetchMock.mock.callCount(), 2);
	});

	void it("rejects with IA_INVALID_OUTPUT when every response is incomplete", async () => {
		const fetchMock = replyWith(
			jsonResponse(responsesBody('{"title": "Co', "incomplete"))
		);

		const error = await assertRejectsWith(
			providerOver(fetchMock).generateJson(CardSchema, REQUEST),
			"IA_INVALID_OUTPUT"
		);

		assert.deepEqual(failureReasons(error), [
			"output was truncated",
			"output was truncated",
			"output was truncated"
		]);
	});

	void it("does not retry a provider error after a broken first output", async () => {
		const fetchMock = replyWith(
			jsonResponse(responsesBody("{broken")),
			jsonResponse({ error: { message: "down" } }, 503)
		);

		await assertRejectsWith(
			providerOver(fetchMock).generateJson(CardSchema, REQUEST),
			"IA_PROVIDER_UNAVAILABLE"
		);
		assert.equal(fetchMock.mock.callCount(), 2);
	});

	for (const status of [401, 429, 500]) {
		void it(`rejects with IA_PROVIDER_UNAVAILABLE on HTTP ${status} without retrying`, async () => {
			const fetchMock = replyWith(
				jsonResponse({ error: { message: "nope" } }, status)
			);

			await assertRejectsWith(
				providerOver(fetchMock).generateJson(CardSchema, REQUEST),
				"IA_PROVIDER_UNAVAILABLE"
			);
			assert.equal(fetchMock.mock.callCount(), 1);
		});
	}

	void it("rejects with IA_TIMEOUT for a hanging request without retrying", async () => {
		const fetchMock = hangingFetch();

		await assertRejectsWith(
			providerOver(fetchMock).generateJson(CardSchema, {
				...REQUEST,
				timeoutMs: 20
			}),
			"IA_TIMEOUT"
		);
		assert.equal(fetchMock.mock.callCount(), 1);
	});

	void it("rejects with IA_INVALID_RESPONSE on an empty body without retrying", async () => {
		const fetchMock = replyWith(jsonResponse({}));

		await assertRejectsWith(
			providerOver(fetchMock).generateJson(CardSchema, REQUEST),
			"IA_INVALID_RESPONSE"
		);
		assert.equal(fetchMock.mock.callCount(), 1);
	});

	void it("serves concurrent calls (double clicks) independently", async () => {
		let calls = 0;
		const fetchMock = scriptedFetch(() => {
			calls += 1;
			if (calls === 2) return jsonResponse({}, 500);
			return jsonResponse(
				responsesBody(
					JSON.stringify({ ...VALID_CARD, title: `c${calls}` })
				)
			);
		});
		const provider = providerOver(fetchMock);

		const results = await Promise.allSettled([
			provider.generateJson(CardSchema, REQUEST),
			provider.generateJson(CardSchema, REQUEST),
			provider.generateJson(CardSchema, REQUEST)
		]);

		assert.deepEqual(
			results.map(result => result.status),
			["fulfilled", "rejected", "fulfilled"]
		);
	});
});

void describe("iaProvider.generateJson input validation", () => {
	const invalidRequests: [string, Record<string, unknown>][] = [
		["blank instructions", { instructions: " " }],
		["blank content", { content: "\n\t" }],
		["zero maxTokens", { maxTokens: 0 }],
		["temperature above 2", { temperature: 3 }],
		["negative timeoutMs", { timeoutMs: -1 }],
		["an empty schemaName", { schemaName: "" }],
		["a blank schemaName", { schemaName: "   " }],
		["a schemaName with spaces", { schemaName: "game card" }],
		["a schemaName with a dot", { schemaName: "game.card" }],
		["a schemaName with emoji", { schemaName: "card🎮" }],
		["a schemaName with HTML", { schemaName: "<b>card</b>" }],
		["a schemaName longer than 64", { schemaName: "a".repeat(65) }]
	];

	for (const [label, override] of invalidRequests) {
		void it(`rejects ${label} with IA_INVALID_INPUT before calling the network`, async () => {
			const fetchMock = replyWith(jsonResponse({}));

			await assertRejectsWith(
				providerOver(fetchMock).generateJson(CardSchema, {
					...REQUEST,
					...override
				}),
				"IA_INVALID_INPUT"
			);
			assert.equal(fetchMock.mock.callCount(), 0);
		});
	}

	void it("accepts a 64 character schemaName with hyphens and underscores", async () => {
		const fetchMock = replyWith(
			jsonResponse(responsesBody(JSON.stringify(VALID_CARD)))
		);
		const schemaName = `a-b_${"c".repeat(60)}`;

		await providerOver(fetchMock).generateJson(CardSchema, {
			...REQUEST,
			schemaName
		});

		const body = sentBody(fetchMock) as {
			text: { format: { name: string } };
		};
		assert.equal(body.text.format.name, schemaName);
	});
});

void describe("iaProvider.generateJson without a configured model", () => {
	void it("rejects with IA_NOT_CONFIGURED without calling the network", async () => {
		const fetchMock = mock.method(globalThis, "fetch", (async () =>
			jsonResponse({})) as typeof fetch);

		await assertRejectsWith(
			iaProvider.generateJson(CardSchema, REQUEST),
			"IA_NOT_CONFIGURED"
		);
		await assertRejectsWith(
			new IaProvider(new DisabledDeepseekProvider()).generateJson(
				CardSchema,
				REQUEST
			),
			"IA_NOT_CONFIGURED"
		);
		assert.equal(fetchMock.mock.callCount(), 0);
	});
});
