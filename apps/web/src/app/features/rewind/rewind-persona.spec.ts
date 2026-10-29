import {
	REWIND_LANGUAGES,
	REWIND_PERSONA_CODES
} from "../../core/models/rewind.model";
import {
	REWIND_PERSONAS,
	REWIND_PERSONAS_BY_LANGUAGE,
	rewindPersona
} from "./rewind-persona";

describe("rewindPersona", () => {
	it("has a title, a phrase and an icon for every persona of the contract", () => {
		for (const code of REWIND_PERSONA_CODES) {
			const persona = REWIND_PERSONAS[code];
			expect(persona.title.length).toBeGreaterThan(0);
			expect(persona.phrase.length).toBeGreaterThan(0);
			expect(persona.icon).toMatch(/^[a-z_]+$/);
		}
	});

	it("keeps the agreed copy shared with the share image", () => {
		expect(rewindPersona("trophy-hunter")).toMatchObject({
			title: "Trophy Hunter",
			phrase: "You didn't just finish games, you emptied them."
		});
		expect(rewindPersona("short-and-sweet").title).toBe("Short & Sweet");
		expect(rewindPersona("finisher").title).toBe("The Finisher");
	});

	it.each([undefined, null, "", "speedrunner", "__proto__", "toString"])(
		"falls back to Steady Player for an unknown code (%s)",
		code => {
			expect(rewindPersona(code)).toBe(REWIND_PERSONAS["steady-player"]);
		}
	);

	it("names every persona in every language with the same icon", () => {
		for (const language of REWIND_LANGUAGES) {
			for (const code of REWIND_PERSONA_CODES) {
				const persona = REWIND_PERSONAS_BY_LANGUAGE[language][code];
				expect(persona.title.length).toBeGreaterThan(0);
				expect(persona.phrase.length).toBeGreaterThan(0);
				expect(persona.icon).toBe(REWIND_PERSONAS[code].icon);
			}
		}
	});

	it("speaks Spanish when the Rewind was generated in Spanish", () => {
		expect(rewindPersona("trophy-hunter", "es").title).toBe("Cazatrofeos");
		expect(rewindPersona("marathoner", "es").title).toBe("Maratonista");
		expect(rewindPersona("speedrunner", "es").title).toBe("Constante");
	});

	it("gives every persona a Spanish title of its own", () => {
		for (const code of REWIND_PERSONA_CODES) {
			expect(rewindPersona(code, "es").title).not.toBe(
				rewindPersona(code, "en").title
			);
		}
	});

	it("falls back to English for an unknown language", () => {
		expect(rewindPersona("finisher", "fr" as never).title).toBe(
			"The Finisher"
		);
	});
});
