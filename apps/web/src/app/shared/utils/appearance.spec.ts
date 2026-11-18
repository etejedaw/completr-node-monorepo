import {
	APPEARANCE_COLORS,
	APPEARANCE_ICON_LABELS,
	APPEARANCE_ICONS
} from "../constants/appearance";
import {
	appearanceColorHex,
	appearanceIconLabel,
	supportedAppearanceColor
} from "./appearance";

describe("appearance options", () => {
	it("includes the platform icons together after sports_esports", () => {
		const start = APPEARANCE_ICONS.indexOf("sports_esports");

		expect(APPEARANCE_ICONS.slice(start + 1, start + 4)).toEqual([
			"smartphone",
			"computer",
			"tv"
		]);
	});

	it("has a readable label for every icon", () => {
		for (const icon of APPEARANCE_ICONS) {
			expect(APPEARANCE_ICON_LABELS[icon]).toBeTruthy();
		}
		expect(appearanceIconLabel("smartphone")).toBe("Phone");
		expect(appearanceIconLabel("computer")).toBe("PC");
		expect(appearanceIconLabel("tv")).toBe("TV");
	});

	it("falls back to the technical name for unknown icons", () => {
		expect(appearanceIconLabel("unknown_icon")).toBe("unknown_icon");
	});

	it("has a readable label for every color", () => {
		for (const color of APPEARANCE_COLORS) {
			expect(color.label).toBeTruthy();
			expect(color.label).not.toBe(color.key);
		}
	});

	it("resolves a known color to its token and anything else to null", () => {
		expect(appearanceColorHex("rose")).toBe("var(--color-view-rose)");
		expect(appearanceColorHex("neon")).toBeNull();
		expect(appearanceColorHex(null)).toBeNull();
		expect(appearanceColorHex(undefined)).toBeNull();
	});

	it("keeps only the colors the picker offers", () => {
		expect(supportedAppearanceColor("teal")).toBe("teal");
		expect(supportedAppearanceColor("#ff0000")).toBeNull();
		expect(supportedAppearanceColor(null)).toBeNull();
	});
});
