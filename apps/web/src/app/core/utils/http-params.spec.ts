import { buildHttpParams } from "./http-params";

describe("buildHttpParams", () => {
	it("returns empty params for null or undefined sources", () => {
		expect(buildHttpParams(null).keys()).toEqual([]);
		expect(buildHttpParams(undefined).keys()).toEqual([]);
	});

	it("serializes strings, numbers and booleans", () => {
		const params = buildHttpParams({ q: "zelda", limit: 10, done: false });

		expect(params.get("q")).toBe("zelda");
		expect(params.get("limit")).toBe("10");
		expect(params.get("done")).toBe("false");
	});

	it("skips null, undefined and empty string values", () => {
		const params = buildHttpParams({
			a: null,
			b: undefined,
			c: "",
			d: "kept"
		});

		expect(params.keys()).toEqual(["d"]);
	});

	it("keeps zero as a valid value", () => {
		expect(buildHttpParams({ offset: 0 }).get("offset")).toBe("0");
	});

	it("appends every array item under the same key and drops empty items", () => {
		const params = buildHttpParams({
			status: ["playing", "", "completed"]
		});

		expect(params.getAll("status")).toEqual(["playing", "completed"]);
	});
});
