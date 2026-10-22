import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { FilterSection } from "./filter-section";

@Component({
	imports: [FilterSection],
	template: `
		<app-filter-section [label]="label" [hint]="hint">
			<span class="body">Body</span>
			<button sectionAction type="button">Clear</button>
		</app-filter-section>
	`
})
class Host {
	label = "Genres";
	hint: string | null = null;
}

describe("FilterSection", () => {
	function render(hint: string | null = null) {
		const fixture = TestBed.createComponent(Host);
		fixture.componentInstance.hint = hint;
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("renders the label as the fieldset legend", () => {
		const element = render();

		expect(element.querySelector("fieldset legend")?.textContent).toContain(
			"Genres"
		);
	});

	it("projects the body and the section action", () => {
		const element = render();

		expect(element.querySelector(".body")?.textContent).toBe("Body");
		expect(element.querySelector("button")?.textContent).toBe("Clear");
	});

	it("shows the hint only when provided", () => {
		expect(render().querySelector("p")).toBeNull();
		expect(render("Pick any").querySelector("p")?.textContent).toContain(
			"Pick any"
		);
	});
});
