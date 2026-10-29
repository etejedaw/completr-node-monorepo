import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { REWIND_INSIGHT_KINDS } from "../../src/rewind/rewind.constants";
import {
	buildRewindRecapInstructions,
	REWIND_INSIGHT_DEFINITIONS
} from "../../src/rewind-recap/rewind-recap.prompt";
import { REWIND_AI_RECAP_LIMITS } from "../../src/rewind-recap/schemas/rewind-ai-recap.schema";

void describe("buildRewindRecapInstructions", () => {
	void it("asks for English output for en", () => {
		const instructions = buildRewindRecapInstructions("en");

		assert.match(instructions, /Write every text value in English\./);
		assert.doesNotMatch(instructions, /Latin American Spanish/);
	});

	void it("asks for neutral Latin American Spanish without voseo for es", () => {
		const instructions = buildRewindRecapInstructions("es");

		assert.match(instructions, /neutral Latin American Spanish/);
		assert.match(instructions, /never vos or vosotros/);
		assert.doesNotMatch(instructions, /Write every text value in English/);
	});

	void it("changes only the requested language between en and es", () => {
		const english = buildRewindRecapInstructions("en");
		const spanish = buildRewindRecapInstructions("es");

		assert.notEqual(english, spanish);
		assert.equal(
			english.replace(/Write every text value in [^\n]*\n/, ""),
			spanish.replace(/Write every text value in [^\n]*\n/, "")
		);
	});

	for (const language of ["en", "es"] as const) {
		void it(`lists the full insight catalog with definitions in ${language}`, () => {
			const instructions = buildRewindRecapInstructions(language);

			for (const kind of REWIND_INSIGHT_KINDS)
				assert.ok(
					instructions.includes(
						`- "${kind}": ${REWIND_INSIGHT_DEFINITIONS[kind]}`
					),
					kind
				);
		});
	}

	void it("mentions JSON, the second person and the no-invention rules", () => {
		const instructions = buildRewindRecapInstructions("en");

		assert.match(instructions, /JSON/);
		assert.match(instructions, /second person/);
		assert.match(
			instructions,
			/Never invent games, numbers, dates or reasons/
		);
		assert.match(instructions, /No plot spoilers/);
		assert.match(instructions, /No markdown and no emojis/);
		assert.match(
			instructions,
			/careful spelling, accents and punctuation for the output language/
		);
		assert.match(instructions, /"5\/5" without context/);
	});

	void it("asks for the prompt limits, which are stricter than the schema", () => {
		const instructions = buildRewindRecapInstructions("en");

		for (const { prompt, schema } of Object.values(
			REWIND_AI_RECAP_LIMITS
		)) {
			assert.ok(prompt < schema);
			assert.match(
				instructions,
				new RegExp(`at most ${prompt} characters`, "i")
			);
		}
		assert.doesNotMatch(instructions, /At most 650 characters/);
	});

	void it("explains the input columns and the 0 to 5 scales", () => {
		const instructions = buildRewindRecapInstructions("en");

		assert.match(
			instructions,
			/"userRating": the player's own rating from 0 to 5/
		);
		assert.match(
			instructions,
			/"criticScore": the critics' score from 0 to 5/
		);
		assert.match(instructions, /"hoursEstimated" is true/);
		assert.match(instructions, /"previousYear"/);
	});
});
