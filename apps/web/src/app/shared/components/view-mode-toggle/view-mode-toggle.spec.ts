import { TestBed } from "@angular/core/testing";

import { type ViewModeOption, ViewModeToggle } from "./view-mode-toggle";

const options: ViewModeOption<string>[] = [
	{ value: "grid", label: "Grid", icon: "grid_view" },
	{ value: "table", label: "Table", icon: "table_rows", title: "Dense table" }
];

describe("ViewModeToggle", () => {
	function render(value = "grid") {
		const fixture = TestBed.createComponent(ViewModeToggle<string>);
		fixture.componentRef.setInput("options", options);
		fixture.componentRef.setInput("value", value);
		fixture.detectChanges();
		return fixture;
	}

	function buttons(fixture: ReturnType<typeof render>) {
		return Array.from(
			(fixture.nativeElement as HTMLElement).querySelectorAll("button")
		);
	}

	it("renders a View mode group with a button per option", () => {
		const fixture = render();

		expect(
			(fixture.nativeElement as HTMLElement)
				.querySelector('[role="group"]')
				?.getAttribute("aria-label")
		).toBe("View mode");
		expect(buttons(fixture).map(button => button.textContent)).toEqual([
			expect.stringContaining("Grid"),
			expect.stringContaining("Table")
		]);
	});

	it("presses only the current option", () => {
		const fixture = render("table");

		expect(
			buttons(fixture).map(b => b.getAttribute("aria-pressed"))
		).toEqual(["false", "true"]);
	});

	it("uses the custom title or falls back to the label view", () => {
		const fixture = render();

		expect(buttons(fixture)[0].title).toBe("Grid view");
		expect(buttons(fixture)[1].title).toBe("Dense table");
	});

	it("changes the value when a button is clicked", () => {
		const fixture = render();

		buttons(fixture)[1].click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe("table");
		expect(buttons(fixture)[1].getAttribute("aria-pressed")).toBe("true");
	});
});
