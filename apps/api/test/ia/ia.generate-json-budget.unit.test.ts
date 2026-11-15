import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import z from "zod";

import { ServiceError } from "../../src/common/errors/service-error";
import {
	type GenerateJsonModelRequest,
	type GenerateTextResult,
	type IaModel
} from "../../src/ia/ia.interface";
import { IaProvider } from "../../src/ia/ia.provider";
import { captureRejection } from "../unit-helpers/mocks";

const REQUEST = {
	instructions: "Reply with a JSON card.",
	content: "Played 3 games.",
	schemaName: "game_card",
	timeoutMs: 25_000
};

const ATTEMPT_DURATION_MS = 22_000;
const BROKEN_OUTPUT: GenerateTextResult = { text: "{", truncated: false };

class SlowBrokenModel implements IaModel {
	readonly isEnabled = true;
	readonly timeouts: (number | undefined)[] = [];

	generateText(): Promise<GenerateTextResult> {
		return Promise.resolve(BROKEN_OUTPUT);
	}

	generateJson(request: GenerateJsonModelRequest) {
		this.timeouts.push(request.timeoutMs);
		mock.timers.tick(ATTEMPT_DURATION_MS);
		return Promise.resolve(BROKEN_OUTPUT);
	}
}

afterEach(() => {
	mock.timers.reset();
});

void describe("iaProvider.generateJson time budget", () => {
	void it("stops retrying when the total budget is nearly spent", async () => {
		mock.timers.enable({ apis: ["Date"], now: 0 });
		const model = new SlowBrokenModel();

		const error = await captureRejection(
			new IaProvider(model).generateJson(
				z.object({ title: z.string() }),
				REQUEST
			)
		);

		assert.ok(error instanceof ServiceError);
		assert.equal(error.code, "IA_INVALID_OUTPUT");
		assert.equal(model.timeouts.length, 2);
		assert.deepEqual(model.timeouts, [25_000, 23_000]);
	});
});
