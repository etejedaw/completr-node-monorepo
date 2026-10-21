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

		expect(group?.getAttribute("aria-label")).toBe(
			"Pick a platform (optional)"
		);
	});
});
