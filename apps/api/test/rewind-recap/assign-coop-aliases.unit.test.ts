import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assignCoopAliases } from "../../src/rewind-recap/utils/assign-coop-aliases.util";
import { finishedRun } from "../rewind/rewind-run.builder";

const ALICE = "11111111-aaaa-4aaa-8aaa-111111111111";
const BRUNO = "22222222-bbbb-4bbb-8bbb-222222222222";
const CARLA = "33333333-cccc-4ccc-8ccc-333333333333";

void describe("assignCoopAliases", () => {
	void it("returns no aliases when nobody played in co-op", () => {
		const runs = [finishedRun("hades", "2026-02-01")];

		assert.deepEqual(assignCoopAliases(runs, []), new Map());
	});

	void it("gives each partner one label in the order they first appear", () => {
		const first = finishedRun("it-takes-two", "2026-01-10");
		const second = finishedRun("overcooked", "2026-03-10");
		const third = finishedRun("portal-2", "2026-05-10");

		const aliases = assignCoopAliases(
			[first, second, third],
			[
				{ runId: third.id, partnerId: ALICE },
				{ runId: second.id, partnerId: BRUNO },
				{ runId: first.id, partnerId: ALICE }
			]
		);

		assert.deepEqual(aliases.get(first.id), ["P1"]);
		assert.deepEqual(aliases.get(second.id), ["P2"]);
		assert.deepEqual(aliases.get(third.id), ["P1"]);
	});

	void it("lists every partner of a run once, whatever order the rows come in", () => {
		const run = finishedRun("deep-rock", "2026-04-01");
		const shuffled = [
			{ runId: run.id, partnerId: CARLA },
			{ runId: run.id, partnerId: ALICE },
			{ runId: run.id, partnerId: CARLA },
			{ runId: run.id, partnerId: BRUNO }
		];

		const aliases = assignCoopAliases([run], shuffled);
		const reversed = assignCoopAliases([run], [...shuffled].reverse());

		assert.deepEqual(aliases.get(run.id), ["P1", "P2", "P3"]);
		assert.deepEqual(reversed, aliases);
	});

	void it("ignores partners of runs outside the list and never exposes their ids", () => {
		const run = finishedRun("hades", "2026-02-01");
		const aliases = assignCoopAliases(
			[run],
			[
				{ runId: "run-from-another-year", partnerId: ALICE },
				{ runId: run.id, partnerId: BRUNO }
			]
		);

		assert.deepEqual([...aliases.keys()], [run.id]);
		assert.deepEqual(aliases.get(run.id), ["P1"]);
		assert.doesNotMatch(JSON.stringify([...aliases]), /aaaa|bbbb/);
	});
});
