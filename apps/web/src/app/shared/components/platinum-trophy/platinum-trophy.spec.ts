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

	it("renders only the trophy icon at run level, with the date in its label", () => {
		const element = render({ scope: "run", platinumedAt: "2026-03-12" });

		const icon = element.querySelector('[role="img"]');
		expect(icon?.getAttribute("aria-label")).toBe(
			"Platinumed in this run on Mar 12, 2026"
		);
		expect(icon?.getAttribute("title")).toBe(
			"Platinumed in this run on Mar 12, 2026"
		);
		expect(element.textContent?.trim()).toBe("emoji_events");
	});

	it("labels the run trophy without a date", () => {
		const element = render({ scope: "run", platinumedAt: null });

		expect(
			element.querySelector('[role="img"]')?.getAttribute("aria-label")
		).toBe("Platinumed in this run");
	});
});
