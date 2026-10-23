import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { GameSection } from "./game-section";

@Component({
	imports: [GameSection],
	template: `
		<app-game-section
			sectionId="dlcs"
			heading="DLCs"
			[count]="count"
			[subheading]="subheading"
		>
			<button sectionActions type="button">Add</button>
			<p>Body content</p>
		</app-game-section>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class Host {
	count: number | null = null;
	subheading: string | null = null;
}

describe("GameSection", () => {
	function render(inputs: Partial<Host> = {}) {
		const fixture = TestBed.createComponent(Host);
		Object.assign(fixture.componentInstance, inputs);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [Host] });
	});

	it("exposes a labelled region identified by the section id", () => {
		const element = render();

		const region = element.querySelector("app-game-section") as HTMLElement;
		expect(region.getAttribute("role")).toBe("region");
		expect(region.id).toBe("dlcs");
		expect(region.getAttribute("aria-labelledby")).toBe("dlcs-heading");
		expect(element.querySelector("#dlcs-heading")?.textContent).toContain(
			"DLCs"
		);
	});

	it("projects the body and the section actions", () => {
		const element = render();

		expect(element.textContent).toContain("Body content");
		expect(element.querySelector("header button")?.textContent).toBe("Add");
	});

	it("omits the count and the subheading by default", () => {
		const element = render();

		expect(element.querySelector("h2 span")).toBeNull();
		expect(element.querySelector("header p")).toBeNull();
	});

	it("renders the count, including zero, and the subheading", () => {
		const element = render({ count: 0, subheading: "Expansions" });

		expect(element.querySelector("h2 span")?.textContent).toBe("0");
		expect(element.querySelector("header p")?.textContent).toContain(
			"Expansions"
		);
	});
});
