import { REWIND_PERSONA_CODES } from "../../core/models/rewind.model";
import { REWIND_PERSONAS, rewindPersona } from "./rewind-persona";

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
});
