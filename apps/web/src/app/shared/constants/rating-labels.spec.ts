import { getRatingLabel, RATING_LABELS } from "./rating-labels";

describe("getRatingLabel", () => {
	it.each(Object.entries(RATING_LABELS))("maps %s to %s", (value, label) => {
		expect(getRatingLabel(Number(value))).toBe(label);
	});

	it("rounds to the nearest half star", () => {
		expect(getRatingLabel(3.2)).toBe("Solid");
		expect(getRatingLabel(3.3)).toBe("Fun");
		expect(getRatingLabel(4.9)).toBe("GOAT");
	});

	it("returns an empty string for null and zero", () => {
		expect(getRatingLabel(null)).toBe("");
		expect(getRatingLabel(0)).toBe("");
	});

	it("returns an empty string when the rounded value has no label", () => {
		expect(getRatingLabel(0.1)).toBe("");
		expect(getRatingLabel(6)).toBe("");
	});
});
