import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { ServiceError } from "../../src/common/errors/service-error";
import * as iaServiceError from "../../src/ia/errors/ia.service-error";
import { iaProvider } from "../../src/ia/ia.provider";
import { type RewindAiRecap } from "../../src/rewind/rewind.interface";
import { buildRewindRecapInstructions } from "../../src/rewind-recap/rewind-recap.prompt";
import { generateRewindAiRecap } from "../../src/rewind-recap/rewind-recap.service";
import { RewindAiRecapSchema } from "../../src/rewind-recap/schemas/rewind-ai-recap.schema";
import { finishedRun } from "../rewind/rewind-run.builder";
import { captureRejection } from "../unit-helpers/mocks";
import { buildRecapInput } from "./rewind-recap.fixtures";

const RECAP: RewindAiRecap = {
	headline: "Your cozy year",
	summary: "You played.\n\nYou finished.",
	insights: [
		{ kind: "genre-pattern", title: "Cozy", body: "Farming games." },
		{ kind: "long-vs-short", title: "Short", body: "Under 10 hours." },
		{ kind: "platform-habit", title: "Switch", body: "All on Switch." }
	],
	funFact: "Two games in one day.",
	nextYearChallenge: "Finish a long one."
};

function stubGenerateJson(implementation: () => Promise<unknown>) {
	return mock.method(
		iaProvider,
		"generateJson",
		implementation as typeof iaProvider.generateJson
	);
}

afterEach(() => {
	mock.restoreAll();
});

void describe("generateRewindAiRecap", () => {
	void it("asks the IA provider for the recap schema with the recap settings", async () => {
		const generateJson = stubGenerateJson(async () => RECAP);
		const input = buildRecapInput(
			[finishedRun("stardew", "2026-04-01", { realDuration: 50 })],
			{ language: "es" }
		);

		const recap = await generateRewindAiRecap(input);

		assert.deepEqual(recap, RECAP);
		assert.equal(generateJson.mock.callCount(), 1);
		const [schema, request] = generateJson.mock.calls[0]?.arguments ?? [];
		assert.equal(schema, RewindAiRecapSchema);
		assert.equal(request?.schemaName, "rewind_ai_recap");
		assert.equal(request?.maxTokens, 3000);
		assert.equal(request?.temperature, 0.5);
		assert.equal(request?.timeoutMs, 25_000);
		assert.equal(request?.instructions, buildRewindRecapInstructions("es"));
		const content = JSON.parse(request?.content ?? "") as {
			games: { rows: unknown[][] };
		};
		assert.equal(content.games.rows[0]?.[0], "STARDEW");
	});

	void it("trims texts and drops unexpected properties", async () => {
		stubGenerateJson(async () => ({
			...RECAP,
			headline: "  Your cozy year \n",
			extra: "ignored",
			insights: RECAP.insights.map(insight => ({
				...insight,
				body: ` ${insight.body} `,
				leaked: true
			}))
		}));

		const recap = await generateRewindAiRecap(buildRecapInput([]));

		assert.deepEqual(recap, RECAP);
	});

	for (const code of [
		"IA_INVALID_OUTPUT",
		"IA_TIMEOUT",
		"IA_NOT_CONFIGURED"
	]) {
		void it(`propagates ${code} from the IA provider`, async () => {
			stubGenerateJson(async () => {
				throw new ServiceError(code, {
					service: "IA Provider",
					raw: undefined
				});
			});

			const error = await captureRejection(
				generateRewindAiRecap(buildRecapInput([]))
			);

			assert.ok(error instanceof ServiceError);
			assert.equal(error.code, code);
		});
	}

	void it("builds a fresh request on every call (double clicks)", async () => {
		const generateJson = stubGenerateJson(async () => RECAP);

		const results = await Promise.allSettled([
			generateRewindAiRecap(buildRecapInput([])),
			generateRewindAiRecap(buildRecapInput([], { language: "es" }))
		]);

		assert.deepEqual(
			results.map(result => result.status),
			["fulfilled", "fulfilled"]
		);
		assert.notEqual(
			generateJson.mock.calls[0]?.arguments[1].instructions,
			generateJson.mock.calls[1]?.arguments[1].instructions
		);
	});

	void it("fails with IA_NOT_CONFIGURED when no model is configured", async () => {
		const error = await captureRejection(
			generateRewindAiRecap(buildRecapInput([]))
		);

		assert.ok(error instanceof ServiceError);
		assert.equal(error.code, iaServiceError.notConfiguredError().code);
	});
});
