import { type BacklogEntry, type BacklogStatus } from "../../../core/models";
import { queueableRuns, resolveQueueIntent } from "./queue-intent";

function run(id: string, status: BacklogStatus): BacklogEntry {
	return { id, status } as BacklogEntry;
}

const NO_QUEUED_RUNS: ReadonlySet<string> = new Set();

describe("queue intent", () => {
	it("creates a new run when the game has no runs", () => {
		expect(resolveQueueIntent([], NO_QUEUED_RUNS)).toEqual({
			kind: "newRun"
		});
	});

	it("creates a new run when no run can be queued", () => {
		const runs = [run("a", "completed"), run("b", "playing")];
		expect(resolveQueueIntent(runs, NO_QUEUED_RUNS)).toEqual({
			kind: "newRun"
		});
	});

	it("queues the only queueable run directly", () => {
		const queueable = run("a", "not_started");
		const runs = [queueable, run("b", "completed")];
		expect(resolveQueueIntent(runs, NO_QUEUED_RUNS)).toEqual({
			kind: "direct",
			run: queueable
		});
	});

	it("asks which run to queue when several are queueable", () => {
		const runs = [run("a", "not_started"), run("b", "not_started")];
		const intent = resolveQueueIntent(runs, NO_QUEUED_RUNS);
		expect(intent.kind).toBe("pick");
	});

	it("skips runs that are already in Up Next", () => {
		const runs = [run("a", "not_started"), run("b", "not_started")];
		expect(queueableRuns(runs, new Set(["a"])).map(r => r.run.id)).toEqual([
			"b"
		]);
	});

	it("numbers runs from the oldest, matching the runs list", () => {
		const runs = [
			run("newest", "not_started"),
			run("middle", "completed"),
			run("oldest", "not_started")
		];
		expect(queueableRuns(runs, NO_QUEUED_RUNS).map(r => r.number)).toEqual([
			3, 1
		]);
	});
});
