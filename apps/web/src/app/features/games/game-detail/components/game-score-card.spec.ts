import { TestBed } from "@angular/core/testing";

import { type CanonicalScore } from "../../../../shared/utils/canonical-score.model";
import { GameScoreCard } from "./game-score-card";

const score = (overrides: Partial<CanonicalScore>): CanonicalScore => ({
	type: null,
	score: null,
	scoreScale: 5,
	duration: null,
	ratio: null,
	...overrides
});

describe("GameScoreCard", () => {
	function render(
		value: CanonicalScore,
		inputs: { reportSent?: boolean; reporting?: boolean } = {}
	) {
		const fixture = TestBed.createComponent(GameScoreCard);
		fixture.componentRef.setInput("score", value);
		for (const [name, input] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, input);
		}
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		const reported = vi.fn();
		fixture.componentInstance.missingDataReported.subscribe(reported);
		return { element, reported };
	}

	function rows(element: HTMLElement) {
		return Array.from(element.querySelectorAll("dl > div")).map(div => ({
			label: div.querySelector("dt")?.textContent?.trim(),
			value: div
				.querySelector("dd")
				?.textContent?.replace(/\s+/g, " ")
				.trim()
		}));
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [GameScoreCard] });
	});

	it("shows the Completr variant with rating label and average duration", () => {
		const { element } = render(
			score({ type: "completr", score: 4, duration: 12, ratio: 0.33 })
		);

		expect(
			element.querySelector("section")?.getAttribute("aria-label")
		).toBe("Completr Score");
		expect(element.textContent).toContain("0.33");
		expect(rows(element)[0].label).toBe("Rating");
		expect(rows(element)[0].value).toContain("Banger");
		expect(rows(element)[1]).toEqual({
			label: "Duration",
			value: "12h avg"
		});
	});

	it("shows the provisional aggregate variant with Metascore and HLTB", () => {
		const { element } = render(
			score({ type: "aggregate", score: 88, duration: 20, ratio: 0.9 })
		);

		expect(
			element.querySelector("section")?.getAttribute("aria-label")
		).toBe("Aggregate Score");
		expect(element.textContent).toContain("Provisional");
		expect(rows(element)).toEqual([
			{ label: "Metascore", value: "88/100" },
			{ label: "HLTB", value: "20h" }
		]);
	});

	it("colors the Metascore by band", () => {
		const high = render(score({ type: "aggregate", score: 80, ratio: 1 }));
		const mid = render(score({ type: "aggregate", score: 60, ratio: 1 }));
		const low = render(score({ type: "aggregate", score: 30, ratio: 1 }));

		const colorOf = (element: HTMLElement) =>
			element.querySelector("dd span")?.className;
		expect(colorOf(high.element)).toContain("text-success");
		expect(colorOf(mid.element)).toContain("text-warning");
		expect(colorOf(low.element)).toContain("text-danger");
	});

	it("shows the RAWG fallback variant", () => {
		const { element } = render(
			score({ type: "rawg", score: 4.2, duration: 9, ratio: 0.5 })
		);

		expect(
			element.querySelector("section")?.getAttribute("aria-label")
		).toBe("RAWG Score");
		expect(rows(element)).toEqual([
			{ label: "Rating", value: "4.2/5" },
			{ label: "Playtime", value: "9h" }
		]);
	});

	it("treats a missing duration as zero hours", () => {
		const { element } = render(
			score({ type: "rawg", score: 4, duration: null, ratio: 1 })
		);

		expect(rows(element)[1].value).toBe("0h");
	});

	describe("without a score", () => {
		it("explains there is no ratio yet and offers to report missing data", () => {
			const { element, reported } = render(score({}));

			expect(element.textContent).toContain("No ratio yet");
			const button = element.querySelector("button") as HTMLButtonElement;
			expect(button.textContent).toContain("Report missing data");
			button.click();
			expect(reported).toHaveBeenCalledTimes(1);
		});

		it("disables the button while the report is being sent", () => {
			const { element } = render(score({}), { reporting: true });

			const button = element.querySelector("button") as HTMLButtonElement;
			expect(button.disabled).toBe(true);
			expect(button.textContent).toContain("Reporting...");
		});

		it("replaces the button with a confirmation once reported", () => {
			const { element } = render(score({}), { reportSent: true });

			expect(element.querySelector("button")).toBeNull();
			expect(
				element.querySelector("[role='status']")?.textContent
			).toContain("Thanks");
		});
	});
});
