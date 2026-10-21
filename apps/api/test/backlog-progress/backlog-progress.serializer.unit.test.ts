import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type BacklogProgress } from "../../src/backlog-progress/backlog-progress.model";
import { backlogProgressSerializer } from "../../src/backlog-progress/backlog-progress.serializer";
import { asModel } from "../unit-helpers/as-model";

void describe("backlogProgressSerializer", () => {
	void it("exposes only id, note and creation date", () => {
		const createdAt = new Date("2024-03-01");
		const entry = asModel<BacklogProgress>({
			id: "p-1",
			note: "reached the final boss",
			createdAt,
			backlogId: "b-1",
			userId: "u-1"
		});

		assert.deepEqual(backlogProgressSerializer(entry), {
			id: "p-1",
			note: "reached the final boss",
			createdAt
		});
	});
});
