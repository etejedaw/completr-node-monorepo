import { metascoreColorClass } from "./metascore-color";

describe("metascoreColorClass", () => {
	it.each([
		[null, "text-fg-muted"],
		[undefined, "text-fg-muted"],
		[100, "text-success"],
		[75, "text-success"],
		[74, "text-warning"],
		[50, "text-warning"],
		[49, "text-danger"],
		[0, "text-danger"]
	])("maps %s to %s", (score, expected) => {
		expect(metascoreColorClass(score)).toBe(expected);
	});
});
