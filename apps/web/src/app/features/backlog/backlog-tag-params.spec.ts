import {
	joinTagList,
	parseTagList,
	TAG_FILTER_LIMIT
} from "./backlog-tag-params";

describe("backlog tag params", () => {
	it("reads an empty or missing param as no tags", () => {
		expect(parseTagList(null)).toEqual([]);
		expect(parseTagList(undefined)).toEqual([]);
		expect(parseTagList("")).toEqual([]);
		expect(parseTagList(",, ,")).toEqual([]);
	});

	it("normalizes, drops duplicates and keeps the first order", () => {
		expect(
			parseTagList(" Relaxing ,co-op,RELAXING,  short   game ")
		).toEqual(["relaxing", "co-op", "short game"]);
	});

	it("drops tags longer than a tag can be", () => {
		expect(parseTagList(`${"x".repeat(41)},cozy`)).toEqual(["cozy"]);
	});

	it("keeps at most the filter limit", () => {
		const many = Array.from({ length: 15 }, (_, i) => `tag${i}`).join(",");
		expect(parseTagList(many)).toHaveLength(TAG_FILTER_LIMIT);
	});

	it("writes no param for an empty selection", () => {
		expect(joinTagList([])).toBeNull();
		expect(joinTagList(["a", "b"])).toBe("a,b");
	});
});
