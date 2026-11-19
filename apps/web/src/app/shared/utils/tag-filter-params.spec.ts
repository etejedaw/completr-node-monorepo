import { userTag } from "../components/my-tag-filter/my-tag-filter.testing";
import {
	joinTagList,
	myTagOption,
	myTagOptions,
	parseTagList,
	TAG_FILTER_LIMIT
} from "./tag-filter-params";

describe("tag filter params", () => {
	it("normalizes, deduplicates and drops empty tags from the URL value", () => {
		expect(parseTagList(",, COZY ,cozy,,Rogue  Like,  ")).toEqual([
			"cozy",
			"rogue like"
		]);
	});

	it("reads nothing from a missing or blank value", () => {
		expect(parseTagList(null)).toEqual([]);
		expect(parseTagList(undefined)).toEqual([]);
		expect(parseTagList(" , ,")).toEqual([]);
	});

	it("drops tags longer than a tag can be and keeps at most the limit", () => {
		const tooLong = "x".repeat(41);
		const many = Array.from({ length: 15 }, (_, index) => `t${index}`);

		expect(parseTagList(`${tooLong},ok`)).toEqual(["ok"]);
		expect(parseTagList(many.join(","))).toHaveLength(TAG_FILTER_LIMIT);
	});

	it("joins tags for the URL and leaves no value when there are none", () => {
		expect(joinTagList(["cozy", "short"])).toBe("cozy,short");
		expect(joinTagList([])).toBeNull();
	});

	it("turns a tag into an option with its icon, color, count and hint", () => {
		const option = myTagOption({
			...userTag("cozy", 3),
			icon: "local_cafe",
			description: "Rainy days"
		});

		expect(option).toMatchObject({
			value: "cozy",
			label: "cozy",
			icon: "local_cafe",
			count: 3,
			hint: "Rainy days"
		});
		expect(option.iconColor).toBeTruthy();
		expect(myTagOption(userTag("short", 2)).hint).toBe(
			"On 2 of your games"
		);
	});

	it("orders your tags by use, then by name, and puts selected tags you no longer have first", () => {
		const options = myTagOptions(
			[userTag("short", 1), userTag("cozy", 4), userTag("calm", 4)],
			["gone", "cozy"]
		);

		expect(options.map(option => option.value)).toEqual([
			"gone",
			"calm",
			"cozy",
			"short"
		]);
		expect(options[0]).toEqual({ value: "gone", label: "gone" });
	});
});
