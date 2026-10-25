import { type BacklogEntry } from "../../core/models";
import { isGamePlatinumed, isPlatinumRun } from "./platinum";

function run(id: string, platinumBacklogId?: string | null): BacklogEntry {
	return {
		id,
		status: "completed",
		isPublic: true,
		game: { id: "game-1", code: "hades", title: "Hades", isDlc: false },
		platform: { id: "platform-1", abbreviation: "PC" },
		platinum:
			platinumBacklogId === undefined
				? null
				: {
						id: "platinum-1",
						backlogId: platinumBacklogId,
						platformId: null,
						platinumedAt: null
					}
	};
}

describe("platinum helpers", () => {
	it("recognises the run where the platinum was earned", () => {
		expect(isPlatinumRun(run("run-1", "run-1"))).toBe(true);
		expect(isPlatinumRun(run("run-2", "run-1"))).toBe(false);
		expect(isPlatinumRun(run("run-1", null))).toBe(false);
		expect(isPlatinumRun(run("run-1"))).toBe(false);
	});

	it("marks every run of a platinumed game as platinumed", () => {
		expect(isGamePlatinumed(run("run-2", "run-1"))).toBe(true);
		expect(isGamePlatinumed(run("run-1", null))).toBe(true);
		expect(isGamePlatinumed(run("run-1"))).toBe(false);
	});
});
