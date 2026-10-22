import { TestBed } from "@angular/core/testing";

import { AppLogo } from "./app-logo";

describe("AppLogo", () => {
	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(AppLogo);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("renders the mark and the wordmark by default", () => {
		const element = render();

		expect(element.textContent).toContain("C");
		expect(element.textContent).toContain("Completr");
		expect(element.classList).toContain("gap-2");
		expect(element.querySelector("span")?.classList).toContain("w-8");
	});

	it("uses the large sizing", () => {
		const element = render({ size: "lg" });

		expect(element.classList).toContain("gap-2.5");
		expect(element.querySelector("span")?.classList).toContain("w-9");
	});

	it("can hide the wordmark", () => {
		const element = render({ wordmark: false });

		expect(element.textContent).not.toContain("Completr");
	});

	it("hides the mark from assistive technology", () => {
		expect(
			render().querySelector("span")?.getAttribute("aria-hidden")
		).toBe("true");
	});
});
