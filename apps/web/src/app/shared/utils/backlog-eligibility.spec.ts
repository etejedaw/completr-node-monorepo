import { type BacklogEntry, type BacklogStatus } from "../../core/models";
import {
	canAddToQueue,
	canChangeStatus,
	canQuickRate,
	canRate,
	uniqueGameIds
} from "./backlog-eligibility";

function run(
	id: string,
	status: BacklogStatus,
	extra: Partial<BacklogEntry> = {}
): BacklogEntry {
	return {
		id,
		status,
		isPublic: true,
		game: { id: `g-${id}`, code: id, title: id, isDlc: false },
		platform: { id: "p", abbreviation: "PC" },
		...extra
	};
}

describe("backlog eligibility", () => {
	it("changes status only from not started, playing and endless", () => {
		expect(canChangeStatus(run("a", "not_started"))).toBe(true);
		expect(canChangeStatus(run("a", "playing"))).toBe(true);
		expect(canChangeStatus(run("a", "endless"))).toBe(true);
		expect(canChangeStatus(run("a", "completed"))).toBe(false);
		expect(canChangeStatus(run("a", "abandoned"))).toBe(false);
	});

	it("rates every run but the not started ones, quick rating only unrated ones", () => {
		expect(canRate(run("a", "not_started"))).toBe(false);
		expect(canRate(run("a", "completed", { userRating: 4 }))).toBe(true);
		expect(canQuickRate(run("a", "completed", { userRating: 4 }))).toBe(
			false
		);
		expect(canQuickRate(run("a", "playing"))).toBe(true);
	});

	it("adds to Up Next only not started runs that are not queued yet", () => {
		const queued = new Set(["b"]);
		expect(canAddToQueue(run("a", "not_started"), queued)).toBe(true);
		expect(canAddToQueue(run("b", "not_started"), queued)).toBe(false);
		expect(canAddToQueue(run("c", "playing"), queued)).toBe(false);
	});

	it("deduplicates game ids across runs", () => {
		const first = run("a", "completed");
		const replay = { ...run("b", "playing"), game: first.game };
		expect(uniqueGameIds([first, replay, run("c", "playing")])).toEqual([
			"g-a",
			"g-c"
		]);
	});
});
