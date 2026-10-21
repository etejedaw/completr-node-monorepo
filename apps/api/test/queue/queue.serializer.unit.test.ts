import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Queue } from "../../src/queue/queue.model";
import {
	publicQueueSerializer,
	queueSerializer
} from "../../src/queue/queue.serializer";
import { asModel } from "../unit-helpers/as-model";
import { buildBacklog } from "../unit-helpers/builders";

void describe("queueSerializer", () => {
	void it("serializes position and the backlog with its ratio", () => {
		const entry = asModel<Queue>({
			id: "q-1",
			position: 2,
			Backlog: buildBacklog({ status: "not_started" })
		});

		const result = queueSerializer(entry, ["cozy"]);

		assert.equal(result.id, "q-1");
		assert.equal(result.position, 2);
		assert.equal(result.backlog?.ratio, 4);
		assert.deepEqual(result.backlog?.moodTags, ["cozy"]);
		assert.deepEqual(result.backlog?.platform, {
			id: "platform-1",
			abbreviation: "PC"
		});
	});

	void it("returns an undefined backlog when the relation was not loaded", () => {
		const result = queueSerializer(
			asModel<Queue>({ id: "q-1", position: 1, Backlog: undefined })
		);

		assert.equal(result.backlog, undefined);
	});

	void it("returns undefined game and platform when they were not loaded", () => {
		const result = queueSerializer(
			asModel<Queue>({
				id: "q-1",
				position: 1,
				Backlog: buildBacklog({ Game: undefined, Platform: undefined })
			})
		);

		assert.equal(result.backlog?.game, undefined);
		assert.equal(result.backlog?.platform, undefined);
	});
});

void describe("publicQueueSerializer", () => {
	void it("omits the backlog notes and keeps the rest of the entry", () => {
		const entry = asModel<Queue>({
			id: "q-1",
			position: 2,
			Backlog: buildBacklog({ status: "not_started", notes: "Private" })
		});

		const result = publicQueueSerializer(entry, ["cozy"]);
		const { notes, ...ownBacklog } = queueSerializer(entry, [
			"cozy"
		]).backlog!;

		assert.equal(notes, "Private");
		assert.equal("notes" in result.backlog!, false);
		assert.deepEqual(result.backlog, ownBacklog);
		assert.equal(result.position, 2);
	});

	void it("returns an undefined backlog when the relation was not loaded", () => {
		const result = publicQueueSerializer(
			asModel<Queue>({ id: "q-1", position: 1, Backlog: undefined })
		);

		assert.equal(result.backlog, undefined);
	});
});
