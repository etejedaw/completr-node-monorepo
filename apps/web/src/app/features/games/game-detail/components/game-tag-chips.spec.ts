import { buildGameTagChips } from "./game-tag-chips";

describe("buildGameTagChips", () => {
	const community = [
		{ tag: "relaxing", players: 4, mine: false },
		{ tag: "cozy", players: 2, mine: true }
	];

	it("adds one player when I vote and removes mine when I take it back", () => {
		expect(buildGameTagChips(community, ["relaxing"], new Set())).toEqual([
			{ tag: "relaxing", players: 5, mine: true },
			{ tag: "cozy", players: 1, mine: false }
		]);
	});

	it("appends a brand new tag of mine with one player", () => {
		expect(
			buildGameTagChips(community, ["cozy", "new one"], new Set())
		).toEqual([
			{ tag: "relaxing", players: 4, mine: false },
			{ tag: "cozy", players: 2, mine: true },
			{ tag: "new one", players: 1, mine: true }
		]);
	});

	it("hides a tag left with nobody unless I touched it in this visit", () => {
		const solo = [{ tag: "podcast", players: 1, mine: true }];

		expect(buildGameTagChips(solo, [], new Set())).toEqual([]);
		expect(buildGameTagChips(solo, [], new Set(["podcast"]))).toEqual([
			{ tag: "podcast", players: 0, mine: false }
		]);
	});

	it("never shows a negative count when the server count lags behind", () => {
		const stale = [{ tag: "odd", players: 0, mine: true }];

		expect(buildGameTagChips(stale, [], new Set(["odd"]))).toEqual([
			{ tag: "odd", players: 0, mine: false }
		]);
	});
});
