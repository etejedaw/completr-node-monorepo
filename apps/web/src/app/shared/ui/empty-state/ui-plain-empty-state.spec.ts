import { TestBed } from "@angular/core/testing";

import { UiPlainEmptyState } from "./ui-plain-empty-state";

describe("UiPlainEmptyState", () => {
	function renderedState(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(UiPlainEmptyState);
		fixture.componentRef.setInput("icon", "rate_review");
		fixture.componentRef.setInput("title", "No reviews yet");
		fixture.componentRef.setInput("message", "Be the first.");
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return { fixture, root: fixture.nativeElement as HTMLElement };
	}

	it("titles the state with an h2 by default", () => {
		const { root } = renderedState();

		expect(root.querySelector("h2")?.textContent?.trim()).toBe(
			"No reviews yet"
		);
		expect(root.querySelector("h1, h3")).toBeNull();
		expect(root.querySelector("section")?.classList).toContain("py-20");
	});

	it("uses an h1 when it is the whole page", () => {
		const { root } = renderedState({ headingLevel: 1 });
		const heading = root.querySelector("h1");

		expect(heading?.textContent?.trim()).toBe("No reviews yet");
		expect(heading?.classList).toContain("text-2xl");
		expect(root.querySelector("h2, h3")).toBeNull();
	});

	it("uses an h3 inside a section or dialog with its own h2", () => {
		const { root } = renderedState({ headingLevel: 3, compact: true });

		expect(root.querySelector("h3")?.textContent?.trim()).toBe(
			"No reviews yet"
		);
		expect(root.querySelector("h1, h2")).toBeNull();
		expect(root.querySelector("section")?.classList).toContain("py-16");
	});

	it("keeps a single heading when the level changes back and forth", () => {
		const { fixture, root } = renderedState({ headingLevel: 3 });
		fixture.componentRef.setInput("headingLevel", 1);
		fixture.detectChanges();
		fixture.componentRef.setInput("headingLevel", 2);
		fixture.detectChanges();

		expect(root.querySelectorAll("h1, h2, h3")).toHaveLength(1);
		expect(root.querySelector("h2")).not.toBeNull();
	});

	it("tightens the padding when it sits inside a panel", () => {
		const { root } = renderedState({ compact: true, inset: true });
		const section = root.querySelector("section");

		expect(section?.classList).toContain("py-6");
		expect(section?.classList).not.toContain("py-16");
		expect(section?.classList).not.toContain("py-20");
	});

	it("hides the icon from assistive technologies", () => {
		const { root } = renderedState();

		expect(
			root.querySelector(".material-icons")?.getAttribute("aria-hidden")
		).toBe("true");
	});
});
