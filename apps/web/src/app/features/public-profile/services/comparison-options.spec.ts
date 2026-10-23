import { COMPARISON_OPTIONS } from "./comparison-options";

describe("COMPARISON_OPTIONS", () => {
	it("compares completed games first, then games yet to play", () => {
		expect(COMPARISON_OPTIONS).toEqual([
			{ value: "completed", label: "Completed" },
			{ value: "not_started", label: "To play" }
		]);
	});
});
