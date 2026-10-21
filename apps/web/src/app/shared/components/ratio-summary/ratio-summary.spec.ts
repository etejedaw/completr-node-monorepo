import { TestBed } from "@angular/core/testing";

import { RatioSummary } from "./ratio-summary";

describe("RatioSummary", () => {
	function render(inputs: Record<string, unknown>) {
		const fixture = TestBed.createComponent(RatioSummary);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [RatioSummary] });
	});

	it("shows the estimated ratio", () => {
		const element = render({ ratio: 4.2 });

		expect(element.textContent).toContain("Ratio");
		expect(element.textContent).toContain("4.2");
	});

	it("shows a dash when the ratio is missing", () => {
		expect(render({ ratio: null }).textContent).toContain("—");
		expect(render({}).textContent).toContain("—");
	});

	it("omits the personal block without a personal ratio", () => {
		const element = render({ ratio: 4 });

		expect(element.textContent).not.toContain("Your run");
	});

	it.each([
		[6, "trending_up", "better than estimated", "text-success"],
		[2, "trending_down", "worse than estimated", "text-warning"],
		[4, "trending_flat", "as estimated", "text-fg-secondary"]
	])(
		"compares a personal ratio of %s with the estimate of 4",
		(personal, icon, caption, textClass) => {
			const element = render({ ratio: 4, personalRatio: personal });

			const block = element.querySelector("[title^='Score per hour']")!;
			expect(block.textContent).toContain("Your run");
			expect(block.textContent).toContain(icon);
			expect(block.textContent).toContain(String(personal));
			expect(block.querySelector(".sr-only")?.textContent).toBe(caption);
			expect(block.querySelector(`.${textClass}`)).not.toBeNull();
			expect(block.getAttribute("title")).toBe(
				`Score per hour you actually played: ${personal} (${caption})`
			);
		}
	);

	it("treats a personal ratio as even when there is no estimate", () => {
		const element = render({ personalRatio: 3 });

		expect(element.querySelector(".sr-only")?.textContent).toBe(
			"as estimated"
		);
	});

	it("shows a zero personal ratio instead of hiding it", () => {
		const element = render({ ratio: 2, personalRatio: 0 });

		expect(element.querySelector(".sr-only")?.textContent).toBe(
			"worse than estimated"
		);
	});

	it("uses a custom label for the personal block", () => {
		const element = render({
			ratio: 2,
			personalRatio: 3,
			personalLabel: "Their run"
		});

		expect(element.textContent).toContain("Their run");
		expect(element.textContent).not.toContain("Your run");
	});
});
