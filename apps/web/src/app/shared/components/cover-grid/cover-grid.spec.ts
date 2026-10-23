import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { CoverGrid } from "./cover-grid";

@Component({
	imports: [CoverGrid],
	template: `
		<app-cover-grid
			[loading]="loading"
			[actionable]="actionable"
			loadingLabel="Loading shelf"
		>
			<li class="cover">One</li>
		</app-cover-grid>
	`
})
class Host {
	loading = false;
	actionable = false;
}

describe("CoverGrid", () => {
	function render(state: Partial<Host> = {}) {
		const fixture = TestBed.createComponent(Host);
		Object.assign(fixture.componentInstance, state);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("projects the covers inside a list", () => {
		const element = render();

		expect(element.querySelector("ul .cover")?.textContent).toBe("One");
		expect(element.querySelector("ul")?.classList).toContain("poster-grid");
	});

	it("marks the list as actionable on demand", () => {
		expect(
			render({ actionable: true }).querySelector("ul")?.classList
		).toContain("poster-grid-actionable");
		expect(render().querySelector("ul")?.classList).not.toContain(
			"poster-grid-actionable"
		);
	});

	it("shows twelve skeleton cards instead of the covers while loading", () => {
		const element = render({ loading: true });

		expect(element.querySelector(".cover")).toBeNull();
		expect(
			element.querySelectorAll("ui-skeleton[variant='rect']")
		).toHaveLength(12);
		const busy = element.querySelector("[aria-busy='true']");
		expect(busy?.getAttribute("aria-label")).toBe("Loading shelf");
	});
});
