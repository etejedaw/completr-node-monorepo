import { TestBed } from "@angular/core/testing";

import { TagIcon } from "./tag-icon";

describe("TagIcon", () => {
	function render(inputs: Record<string, unknown>) {
		const fixture = TestBed.createComponent(TagIcon);
		for (const [name, value] of Object.entries(inputs))
			fixture.componentRef.setInput(name, value);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("shows the chosen icon in the chosen color and hides it from screen readers", () => {
		const element = render({ icon: "bolt", color: "rose" });

		expect(element.textContent).toBe("bolt");
		expect(element.style.color).toBe("var(--color-view-rose)");
		expect(element.getAttribute("aria-hidden")).toBe("true");
		expect(element.classList).toContain("material-icons");
	});

	it("falls back to the tag icon in the brand color", () => {
		const element = render({ icon: null, color: null });

		expect(element.textContent).toBe("label");
		expect(element.style.color).toBe("var(--color-brand)");
	});
});
