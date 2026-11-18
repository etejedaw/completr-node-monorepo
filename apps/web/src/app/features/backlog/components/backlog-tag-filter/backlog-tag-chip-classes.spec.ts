import {
	tagChipClass,
	tagChipCountClass,
	tagChipIconClass
} from "./backlog-tag-chip-classes";

describe("tag chip classes", () => {
	it("fills a selected chip with the brand gradient, white text and the brand glow", () => {
		const classes = tagChipClass(true);

		expect(classes).toContain("var(--color-brand)");
		expect(classes).toContain("var(--color-brand-deep)");
		expect(classes).toContain("text-white");
		expect(classes).toContain("var(--color-brand-glow)");
		expect(tagChipIconClass(true)).toContain("text-white");
		expect(tagChipCountClass(true)).toContain("text-white");
	});

	it("darkens the gradient with the theme canvas so white text keeps its contrast", () => {
		expect(tagChipClass(true)).toContain(
			"color-mix(in_srgb,var(--color-brand)_70%,var(--color-canvas))"
		);
	});

	it("gives an unselected chip its own background and a brand-tinted tag icon", () => {
		expect(tagChipClass(false)).toContain("bg-surface");
		expect(tagChipClass(false)).toContain("hover:border-brand/50");
		expect(tagChipIconClass(false)).toContain("bg-brand-subtle");
		expect(tagChipIconClass(false)).toContain("rounded-full");
	});

	it("only moves or animates when the user allows motion", () => {
		const tokens = tagChipClass(false).split(" ");

		expect(
			tokens.filter(
				token =>
					/(^|:)(transition|duration|ease|-?translate)/.test(token) &&
					!token.startsWith("motion-safe:")
			)
		).toEqual([]);
	});

	it("keeps the 44px touch target", () => {
		expect(tagChipClass(false)).toContain("tap:min-h-[44px]");
		expect(tagChipClass(true)).toContain("tap:min-h-[44px]");
	});
});
