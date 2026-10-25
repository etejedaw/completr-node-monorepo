import { TestBed } from "@angular/core/testing";

import { PlatinumTrophy } from "./platinum-trophy";

describe("PlatinumTrophy", () => {
	function render(inputs: Record<string, unknown>) {
		const fixture = TestBed.createComponent(PlatinumTrophy);
		for (const [name, value] of Object.entries(inputs))
			fixture.componentRef.setInput(name, value);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [PlatinumTrophy] });
	});

	it("renders only the labelled trophy icon at game level", () => {
		const element = render({ scope: "game" });

		const icon = element.querySelector('[role="img"]');
		expect(icon?.getAttribute("aria-label")).toBe("Platinumed");
		expect(icon?.textContent?.trim()).toBe("emoji_events");
		expect(element.textContent).not.toContain("Platinumed on");
	});

	it("renders the trophy with the date at run level", () => {
		const element = render({ scope: "run", platinumedAt: "2026-03-12" });

		expect(element.querySelector('[role="img"]')).toBeNull();
		expect(element.textContent?.replace(/\s+/g, " ")).toContain(
			"Platinumed on Mar 12, 2026"
		);
	});

	it("says Platinumed without a date at run level", () => {
		const element = render({ scope: "run", platinumedAt: null });

		expect(element.textContent?.replace(/\s+/g, " ").trim()).toBe(
			"emoji_events Platinumed"
		);
	});
});
