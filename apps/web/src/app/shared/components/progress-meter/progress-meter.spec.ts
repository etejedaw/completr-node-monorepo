import { TestBed } from "@angular/core/testing";

import { ProgressMeter } from "./progress-meter";

describe("ProgressMeter", () => {
	function render(completed: number, total: number) {
		const fixture = TestBed.createComponent(ProgressMeter);
		fixture.componentRef.setInput("label", "Progress");
		fixture.componentRef.setInput("completed", completed);
		fixture.componentRef.setInput("total", total);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	function bar(element: HTMLElement) {
		return element.querySelector('[role="progressbar"]') as HTMLElement;
	}

	it("shows the label and the completed/total counter", () => {
		const element = render(3, 10);

		expect(element.textContent).toContain("Progress");
		expect(element.textContent).toContain("3/10");
		expect(element.textContent).not.toContain("Completed");
	});

	it("fills the bar proportionally", () => {
		const element = render(3, 10);

		expect(bar(element).getAttribute("aria-valuenow")).toBe("3");
		expect(bar(element).getAttribute("aria-valuemax")).toBe("10");
	});

	it("shows the Completed badge when every item is done", () => {
		const element = render(10, 10);

		expect(element.textContent).toContain("Completed");
	});

	it("shows the Completed badge when completed exceeds the total", () => {
		expect(render(12, 10).textContent).toContain("Completed");
	});

	it("never shows Completed for an empty total", () => {
		const element = render(0, 0);

		expect(element.textContent).not.toContain("Completed");
		expect(element.textContent).toContain("0/0");
		expect(bar(element).getAttribute("aria-valuemax")).toBe("1");
	});
});
