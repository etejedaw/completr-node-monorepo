import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fixSpanishImperativeAccents } from "../../src/rewind-recap/utils/fix-spanish-imperative-accents.util";

void describe("fixSpanishImperativeAccents", () => {
	void it("drops the wrong accent of two-syllable imperatives with te", () => {
		for (const [wrong, right] of [
			["Propónte terminar un shooter.", "Proponte terminar un shooter."],
			["pónte una meta", "ponte una meta"],
			["Deténte un momento", "Detente un momento"],
			["manténte firme", "mantente firme"],
			["PROPÓNTE algo", "PROPONTE algo"],
			["dispónte, impónte y compónte", "disponte, imponte y componte"]
		] as [string, string][])
			assert.equal(fixSpanishImperativeAccents(wrong), right);
	});

	void it("leaves correct words, other accents and words that only contain the pattern alone", () => {
		for (const text of [
			"Proponte terminar algo y ponte una meta.",
			"Atrévete con un juego largo, anímate y diviértete.",
			"Ponte a prueba: el último tramo del año fue más lento.",
			"Un horizonte de juegos de acción.",
			"superpónteres no es una palabra",
			""
		])
			assert.equal(fixSpanishImperativeAccents(text), text);
	});
});
