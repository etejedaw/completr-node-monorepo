import { normalizeTag } from "./normalize-tag";

describe("normalizeTag", () => {
	it("lowercases, trims, strips accents and collapses spaces like the API", () => {
		expect(normalizeTag("  Relajánte   CON\tAmigos ")).toBe(
			"relajante con amigos"
		);
	});

	it("turns blank input into an empty tag", () => {
		expect(normalizeTag(" \n\t ")).toBe("");
	});
});
