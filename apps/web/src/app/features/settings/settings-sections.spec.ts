import { SETTINGS_SECTIONS } from "./settings-sections";

describe("SETTINGS_SECTIONS", () => {
	it("lists profile, privacy, appearance and security in that order", () => {
		expect(SETTINGS_SECTIONS.map(section => section.path)).toEqual([
			"profile",
			"privacy",
			"appearance",
			"security"
		]);
	});

	it("gives every section a label, icon and description", () => {
		for (const section of SETTINGS_SECTIONS) {
			expect(section.label).not.toBe("");
			expect(section.icon).not.toBe("");
			expect(section.description).not.toBe("");
		}
	});

	it("uses unique paths", () => {
		const paths = SETTINGS_SECTIONS.map(section => section.path);
		expect(new Set(paths).size).toBe(paths.length);
	});
});
