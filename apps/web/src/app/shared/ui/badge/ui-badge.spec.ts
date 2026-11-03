import { TestBed } from "@angular/core/testing";

import { UiBadge } from "./ui-badge";

describe("UiBadge", () => {
	function renderedBadge(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(UiBadge);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("uses the neutral tone without an icon by default", () => {
		const badge = renderedBadge();

		expect(badge.classList).toContain("text-fg-secondary");
		expect(badge.querySelector(".material-icons")).toBeNull();
	});

	it("paints the requested tone", () => {
		const badge = renderedBadge({ tone: "danger" });

		expect(badge.classList).toContain("text-danger");
		expect(badge.classList).not.toContain("text-fg-secondary");
	});

	it("keeps its base classes when the tone changes", () => {
		const badge = renderedBadge({ tone: "success" });

		expect(badge.classList).toContain("rounded-full");
		expect(badge.classList).toContain("whitespace-nowrap");
	});

	it.each([
		["playing", "text-playing"],
		["muted", "text-fg-muted"]
	])("paints the %s status tone", (tone, textClass) => {
		const badge = renderedBadge({ tone });

		expect(badge.classList).toContain(textClass);
	});

	it("hides the icon from assistive technologies", () => {
		const icon = renderedBadge({ icon: "check_circle" }).querySelector(
			".material-icons"
		);

		expect(icon?.textContent?.trim()).toBe("check_circle");
		expect(icon?.getAttribute("aria-hidden")).toBe("true");
	});
});
