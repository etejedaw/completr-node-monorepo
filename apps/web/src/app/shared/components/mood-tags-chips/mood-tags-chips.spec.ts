import { TestBed } from "@angular/core/testing";

import { MoodTagsChips } from "./mood-tags-chips";

describe("MoodTagsChips", () => {
	function render(inputs: Record<string, unknown>) {
		const fixture = TestBed.createComponent(MoodTagsChips);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("renders one chip per tag", () => {
		const element = render({ tags: ["cozy", "short"] });

		expect(
			Array.from(element.querySelectorAll("span")).map(s => s.textContent)
		).toEqual(["cozy", "short"]);
	});

	it.each([[[]], [null], [undefined]])("renders nothing for %j", tags => {
		expect(render({ tags }).querySelector("div")).toBeNull();
	});

	it("applies the extra container class", () => {
		const element = render({ tags: ["cozy"], containerClass: "mt-0.5" });

		expect(element.querySelector("div")?.classList).toContain("mt-0.5");
	});
});
