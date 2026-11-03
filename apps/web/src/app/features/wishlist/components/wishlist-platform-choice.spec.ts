import { TestBed } from "@angular/core/testing";

import { WishlistPlatformChoice } from "./wishlist-platform-choice";

describe("WishlistPlatformChoice", () => {
	it("names the platform radiogroup after its legend", () => {
		const fixture = TestBed.createComponent(WishlistPlatformChoice);
		fixture.componentRef.setInput("platforms", [
			{ id: "p1", name: "PC", abbreviation: "PC" }
		]);
		fixture.detectChanges();

		const group = (fixture.nativeElement as HTMLElement).querySelector(
			'[role="radiogroup"]'
		);

		expect(group?.getAttribute("aria-label")).toBe("Platform (optional)");
	});

	it("labels the group as an optional field without a required marker", () => {
		const fixture = TestBed.createComponent(WishlistPlatformChoice);
		fixture.componentRef.setInput("platforms", [
			{ id: "p1", name: "PC", abbreviation: "PC" }
		]);
		fixture.detectChanges();

		const legend = (fixture.nativeElement as HTMLElement).querySelector(
			"legend"
		);

		expect(legend?.textContent?.replace(/\s+/g, " ").trim()).toBe(
			"Platform Optional"
		);
		expect(legend?.textContent).not.toContain("*");
	});
});
