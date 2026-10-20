import {
	correctedTypedValue,
	estimatedRatio,
	MAX_CRITIC_SCORE,
	pickDefaultDuration,
	roundReferenceValue,
	toCriticScore
} from "./reference-values";

function numberInput(value: string): HTMLInputElement {
	const input = document.createElement("input");
	input.type = "number";
	input.value = value;
	return input;
}

describe("reference values", () => {
	it("clamps a typed critic score above the maximum", () => {
		expect(correctedTypedValue(numberInput("7"), MAX_CRITIC_SCORE)).toBe(
			MAX_CRITIC_SCORE
		);
	});

	it("rounds typed values with more than two decimals", () => {
		expect(correctedTypedValue(numberInput("12.345"))).toBe(12.35);
	});

	it("leaves typed values with up to two decimals untouched", () => {
		expect(correctedTypedValue(numberInput("4.25"))).toBeNull();
		expect(correctedTypedValue(numberInput(""))).toBeNull();
	});

	it("rounds stored values and keeps null", () => {
		expect(roundReferenceValue(3.14159)).toBe(3.14);
		expect(roundReferenceValue(null)).toBeNull();
	});

	it("limits normalized source scores to two decimals and the maximum", () => {
		expect(toCriticScore(4.256)).toBe(4.26);
		expect(toCriticScore(5.2)).toBe(MAX_CRITIC_SCORE);
	});

	it("computes the estimated ratio only with both values", () => {
		expect(estimatedRatio(4, 20)).toBe(4);
		expect(estimatedRatio(null, 20)).toBeNull();
		expect(estimatedRatio(4, 0)).toBeNull();
	});

	it("picks the duration by source priority", () => {
		expect(
			pickDefaultDuration([
				{ source: "rawg", duration: 30 },
				{ source: "hltb", duration: 25.555 }
			])
		).toEqual({ value: 25.56, source: "hltb" });
		expect(pickDefaultDuration(undefined)).toEqual({
			value: null,
			source: ""
		});
	});
});
