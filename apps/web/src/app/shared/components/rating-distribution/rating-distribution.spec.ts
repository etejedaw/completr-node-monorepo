import { TestBed } from "@angular/core/testing";

import { RatingDistribution } from "./rating-distribution";

describe("RatingDistribution", () => {
	function render(inputs: Record<string, unknown>) {
		const fixture = TestBed.createComponent(RatingDistribution);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	function widths(element: HTMLElement) {
		return Array.from(
			element.querySelectorAll<HTMLElement>("li span.block")
		).map(bar => bar.style.width);
	}

	it("renders a row per bucket with its stars and count", () => {
		const element = render({
			buckets: [
				{ stars: 5, count: 3 },
				{ stars: 4, count: 1 }
			]
		});
		const rows = Array.from(element.querySelectorAll("li"));

		expect(rows).toHaveLength(2);
		expect(rows[0].textContent).toContain("5");
		expect(rows[0].textContent).toContain("3");
		expect(rows[1].textContent).toContain("1");
	});

	it("sizes each bar by its share of the total", () => {
		const element = render({
			buckets: [
				{ stars: 5, count: 3 },
				{ stars: 4, count: 1 }
			]
		});

		expect(widths(element)).toEqual(["75%", "25%"]);
	});

	it("keeps every bar empty when there are no ratings", () => {
		const element = render({
			buckets: [
				{ stars: 5, count: 0 },
				{ stars: 4, count: 0 }
			]
		});

		expect(widths(element)).toEqual(["0%", "0%"]);
	});

	it("uses the default label and item label for assistive tech", () => {
		const element = render({ buckets: [{ stars: 5, count: 2 }] });

		expect(element.querySelector("ul")?.getAttribute("aria-label")).toBe(
			"Rating distribution"
		);
		expect(element.querySelector(".sr-only")?.textContent).toContain(
			"reviews with 5 stars"
		);
	});

	it("accepts a custom label and item label", () => {
		const element = render({
			buckets: [{ stars: 3, count: 2 }],
			label: "Your ratings",
			itemLabel: "games"
		});

		expect(element.querySelector("ul")?.getAttribute("aria-label")).toBe(
			"Your ratings"
		);
		expect(element.querySelector(".sr-only")?.textContent).toContain(
			"games with 3 stars"
		);
	});
});
