import { TestBed } from "@angular/core/testing";

import { UiSearchBar } from "./ui-search-bar";

describe("UiSearchBar", () => {
	function renderedInput(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(UiSearchBar);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return (fixture.nativeElement as HTMLElement).querySelector(
			"input"
		) as HTMLInputElement;
	}

	it("names the input after the placeholder without its trailing ellipsis", () => {
		const input = renderedInput({ placeholder: "Search your library..." });

		expect(input.getAttribute("aria-label")).toBe("Search your library");
	});

	it("prefers the explicit accessible name", () => {
		const input = renderedInput({
			placeholder: "Search...",
			ariaLabel: "Search Want to Get"
		});

		expect(input.getAttribute("aria-label")).toBe("Search Want to Get");
	});
});
