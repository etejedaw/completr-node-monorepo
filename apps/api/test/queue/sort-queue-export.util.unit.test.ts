import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Queue } from "../../src/queue/queue.model";
import { sortQueueExport } from "../../src/queue/sort-queue-export.util";

function entry(
	position: number,
	score: number | undefined,
	duration: number | undefined
) {
	return { position, Backlog: { score, duration } } as unknown as Queue;
}

function positions(entries: Queue[]) {
	return entries.map(queueEntry => queueEntry.position);
}

const ENTRIES = [
	entry(1, 3, 20),
	entry(2, undefined, 10),
	entry(3, 5, 5),
	entry(4, 4, undefined),
	entry(5, 5, 5)
];

void describe("sortQueueExport", () => {
	void it("keeps the position order for manual", () => {
		assert.deepEqual(
			positions(sortQueueExport(ENTRIES, "manual")),
			[1, 2, 3, 4, 5]
		);
	});

	void it("sorts by ratio descending with missing ratios last and ties by position", () => {
		assert.deepEqual(
			positions(sortQueueExport(ENTRIES, "ratio")),
			[3, 5, 1, 2, 4]
		);
	});

	void it("sorts by score descending with missing scores last", () => {
		assert.deepEqual(
			positions(sortQueueExport(ENTRIES, "score")),
			[3, 5, 4, 1, 2]
		);
	});

	void it("sorts by duration ascending with missing durations last", () => {
		assert.deepEqual(
			positions(sortQueueExport(ENTRIES, "duration")),
			[3, 5, 2, 1, 4]
		);
	});

	void it("does not mutate the input", () => {
		const input = [...ENTRIES];
		sortQueueExport(input, "score");
		assert.deepEqual(positions(input), [1, 2, 3, 4, 5]);
	});
});
