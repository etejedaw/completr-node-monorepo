import { tagColorOf, tagIconOf } from "./tag-appearance";

describe("tag appearance", () => {
	it("uses the chosen icon or the default tag icon", () => {
		expect(tagIconOf("bolt")).toBe("bolt");
		expect(tagIconOf(null)).toBe("label");
		expect(tagIconOf("")).toBe("label");
	});

	it("uses the chosen color or the brand color, also for unknown colors", () => {
		expect(tagColorOf("emerald")).toBe("var(--color-view-emerald)");
		expect(tagColorOf(null)).toBe("var(--color-brand)");
		expect(tagColorOf("#123456")).toBe("var(--color-brand)");
	});
});
