import "./ia-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { iaProvider } from "../../src/ia/ia.provider";

afterEach(() => {
	mock.restoreAll();
});

void describe("ia provider with DEEPSEEK_API_KEY", () => {
	void it("reports AI as configured", () => {
		assert.equal(iaProvider.isConfigured, true);
	});

	void it("sends trimmed input with the configured key and model and returns the text", async () => {
		const fetchMock = mock.method(
			globalThis,
			"fetch",
			(async () =>
				new Response(
					JSON.stringify({
						choices: [
							{
								finish_reason: "stop",
								message: { content: "Nice 🎮" }
							}
						]
					})
				)) as typeof fetch
		);

		const result = await iaProvider.generateText({
			instructions: "  Summarize. ",
			content: " Played <b>3</b> games 👾 ",
			maxTokens: 100
		});

		assert.deepEqual(result, { text: "Nice 🎮", truncated: false });
		const init = fetchMock.mock.calls[0]?.arguments[1] as RequestInit;
		assert.equal(
			(init.headers as Record<string, string>).Authorization,
			"Bearer fake-key"
		);
		const body = JSON.parse(String(init.body)) as {
			model: string;
			messages: { content: string }[];
		};
		assert.equal(body.model, "fake-model");
		assert.equal(body.messages[0]?.content, "Summarize.");
		assert.equal(body.messages[1]?.content, "Played <b>3</b> games 👾");
	});
});
