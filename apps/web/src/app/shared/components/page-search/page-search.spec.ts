import { TestBed } from "@angular/core/testing";

import { PageSearch } from "./page-search";

function render(inputs: Record<string, unknown> = {}) {
	const fixture = TestBed.createComponent(PageSearch);
	fixture.componentRef.setInput("noun", "game");
	for (const [name, value] of Object.entries(inputs))
		fixture.componentRef.setInput(name, value);
	fixture.detectChanges();
	return fixture;
}

function field(fixture: ReturnType<typeof render>) {
	return fixture.nativeElement.querySelector("input") as HTMLInputElement;
}

function status(fixture: ReturnType<typeof render>) {
	return fixture.nativeElement.querySelector(
		"[role=status]"
	) as HTMLElement | null;
}

describe("PageSearch", () => {
	it("says how many items it filters and by what", () => {
		const fixture = render({ count: 1234, filterBy: "title" });

		expect(field(fixture).placeholder).toBe("Filter 1,234 games by title");
		expect(field(fixture).getAttribute("aria-label")).toBe(
			"Filter games by title"
		);
	});

	it("uses the singular noun for a single item", () => {
		const fixture = render({ count: 1 });

		expect(field(fixture).placeholder).toBe("Filter 1 game by title");
	});

	it("uses the plural noun given for irregular plurals", () => {
		const fixture = render({
			noun: "entry",
			nounPlural: "entries",
			count: 3,
			filterBy: "name"
		});

		expect(field(fixture).placeholder).toBe("Filter 3 entries by name");
	});

	it("leaves the number out while the count is unknown", () => {
		const fixture = render({ count: null });

		expect(field(fixture).placeholder).toBe("Filter games by title");
	});

	it("hides a stale count while the page reloads its list", () => {
		const fixture = render({ count: 40, loading: true, value: "zel" });

		expect(field(fixture).placeholder).toBe("Filter games by title");
		expect(status(fixture)?.textContent?.trim()).toBe("");

		fixture.componentRef.setInput("count", 2);
		fixture.componentRef.setInput("loading", false);
		fixture.detectChanges();

		expect(status(fixture)?.textContent?.trim()).toBe("2 games");
	});

	it("keeps the accessible name the page gives it", () => {
		const fixture = render({ ariaLabel: "Search your library" });

		expect(field(fixture).getAttribute("aria-label")).toBe(
			"Search your library"
		);
	});

	it("shows the filter icon instead of the search icon", () => {
		const fixture = render();
		const icon = fixture.nativeElement.querySelector(
			".material-icons"
		) as HTMLElement;

		expect(icon.textContent?.trim()).toBe("filter_list");
	});

	it("announces the matches only while there is text to filter by", () => {
		const fixture = render({ count: 2 });

		expect(status(fixture)?.textContent?.trim()).toBe("");

		fixture.componentRef.setInput("value", "castle");
		fixture.detectChanges();

		expect(field(fixture).value).toBe("castle");
		expect(status(fixture)?.textContent?.trim()).toBe("2 games");
	});

	it("emits every change the user types and clears", () => {
		const fixture = render({ value: "hades" });
		const changes: string[] = [];
		fixture.componentInstance.valueChange.subscribe(value =>
			changes.push(value)
		);

		const input = field(fixture);
		input.value = "hades 2";
		input.dispatchEvent(new Event("input"));
		fixture.detectChanges();
		(
			fixture.nativeElement.querySelector(
				"button[aria-label='Clear search']"
			) as HTMLButtonElement
		).click();

		expect(changes).toEqual(["hades 2", ""]);
	});
});
