import { TestBed } from "@angular/core/testing";

import { ViewModeToggle } from "./view-mode-toggle";
import { type ViewModeOption } from "./view-mode-toggle.model";

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

	it("renders a View mode group with an icon-only button per option", () => {
		const fixture = render();

		expect(
			(fixture.nativeElement as HTMLElement)
				.querySelector('[role="group"]')
				?.getAttribute("aria-label")
		).toBe("View mode");
		expect(
			buttons(fixture).map(
				button => button.querySelector(".sr-only")?.textContent
			)
		).toEqual(["Grid", "Table"]);
		expect(
			buttons(fixture).map(
				button => button.querySelector(".material-icons")?.textContent
			)
		).toEqual(["grid_view", "table_rows"]);
		expect(buttons(fixture)[0].hasAttribute("role")).toBe(false);
	});

	it("presses only the current option", () => {
		const fixture = render("table");

		expect(
			buttons(fixture).map(button => button.getAttribute("aria-pressed"))
		).toEqual(["false", "true"]);
		expect(buttons(fixture)[0].hasAttribute("aria-checked")).toBe(false);
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

	it("keeps the last choice after quick repeated clicks", () => {
		const fixture = render();
		const emitted: string[] = [];
		fixture.componentInstance.value.subscribe(value => emitted.push(value));

		buttons(fixture)[1].click();
		buttons(fixture)[1].click();
		buttons(fixture)[0].click();
		fixture.detectChanges();

		expect(fixture.componentInstance.value()).toBe("grid");
		expect(emitted).toEqual(["table", "grid"]);
	});
});
