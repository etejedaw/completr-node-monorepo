import { TestBed } from "@angular/core/testing";

import { PageSearch } from "./page-search";

describe("PageSearch", () => {
	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(PageSearch);
		fixture.componentRef.setInput("scopeLabel", "My Games");
		for (const [name, value] of Object.entries(inputs))
			fixture.componentRef.setInput(name, value);
		fixture.detectChanges();
		return fixture;
	}

	it("renders the page search bar with the given placeholder and value", () => {
		const fixture = render({
			placeholder: "Search your library...",
			value: "hades"
		});
		const field = fixture.nativeElement.querySelector(
			"input"
		) as HTMLInputElement;

		expect(field.placeholder).toBe("Search your library...");
		expect(field.value).toBe("hades");
	});

	it("emits every change typed in the bar", () => {
		const fixture = render();
		const changes: string[] = [];
		fixture.componentInstance.valueChange.subscribe(value =>
			changes.push(value)
		);
		const field = fixture.nativeElement.querySelector(
			"input"
		) as HTMLInputElement;

		field.value = "celeste";
		field.dispatchEvent(new Event("input"));

		expect(changes).toEqual(["celeste"]);
	});
});
