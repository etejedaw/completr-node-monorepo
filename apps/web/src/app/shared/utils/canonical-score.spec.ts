import { pickCanonicalScore } from "./canonical-score";

describe("pickCanonicalScore", () => {
	it("returns an empty result for a missing game", () => {
		const empty = {
			type: null,
			score: null,
			scoreScale: 5,
			duration: null,
			ratio: null
		};

		expect(pickCanonicalScore(null)).toEqual(empty);
		expect(pickCanonicalScore(undefined)).toEqual(empty);
		expect(pickCanonicalScore({})).toEqual(empty);
	});

	it("prefers the completr score and time over any other source", () => {
		const result = pickCanonicalScore({
			scores: [
				{ source: "metacritic", score: 90 },
				{ source: "completr", score: 4.5 }
			],
			times: [
				{ source: "hltb", duration: 10 },
				{ source: "completr", duration: 9 }
			]
		} as never);

		expect(result).toEqual({
			type: "completr",
			score: 4.5,
			scoreScale: 5,
			duration: 9,
			ratio: 0.5
		});
	});

	it("falls back to metacritic and hltb on the 100 scale", () => {
		const result = pickCanonicalScore({
			scores: [{ source: "metacritic", score: 90 }],
			times: [{ source: "hltb", duration: 12 }]
		} as never);

		expect(result).toEqual({
			type: "aggregate",
			score: 90,
			scoreScale: 100,
			duration: 12,
			ratio: 7.5
		});
	});

	it("falls back to rawg normalizing its 5 point score by 20", () => {
		const result = pickCanonicalScore({
			scores: [{ source: "rawg", score: 4 }],
			times: [{ source: "rawg", duration: 16 }]
		} as never);

		expect(result).toEqual({
			type: "rawg",
			score: 4,
			scoreScale: 5,
			duration: 16,
			ratio: 5
		});
	});

	it("rounds the ratio to two decimals", () => {
		const result = pickCanonicalScore({
			scores: [{ source: "completr", score: 4 }],
			times: [{ source: "completr", duration: 3 }]
		} as never);

		expect(result.ratio).toBe(1.33);
	});

	it("skips a source whose duration is zero and uses the next one", () => {
		const result = pickCanonicalScore({
			scores: [
				{ source: "completr", score: 4 },
				{ source: "metacritic", score: 80 }
			],
			times: [
				{ source: "completr", duration: 0 },
				{ source: "hltb", duration: 8 }
			]
		} as never);

		expect(result.type).toBe("aggregate");
		expect(result.ratio).toBe(10);
	});

	it("does not mix a score from one source with the time of another", () => {
		const result = pickCanonicalScore({
			scores: [{ source: "completr", score: 4 }],
			times: [{ source: "hltb", duration: 8 }]
		} as never);

		expect(result.type).toBeNull();
	});

	it("accepts a zero score as a valid value", () => {
		const result = pickCanonicalScore({
			scores: [{ source: "completr", score: 0 }],
			times: [{ source: "completr", duration: 5 }]
		} as never);

		expect(result).toMatchObject({ type: "completr", ratio: 0 });
	});
});
