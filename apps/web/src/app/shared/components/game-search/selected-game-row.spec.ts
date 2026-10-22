import { TestBed } from "@angular/core/testing";

import { SelectedGameRow } from "./selected-game-row";

describe("SelectedGameRow", () => {
	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(SelectedGameRow);
		fixture.componentRef.setInput("game", {
			title: "Hades",
			releaseAt: "2020-09-17"
		});
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture;
	}

	function text(fixture: ReturnType<typeof render>) {
		return (fixture.nativeElement as HTMLElement).textContent ?? "";
	}

	it("shows the label, the title and the release year", () => {
		const fixture = render();

		expect(text(fixture)).toContain("Game");
		expect(text(fixture)).toContain("Hades");
		expect(text(fixture)).toContain("2020");
	});

	it("joins the year and the extra meta", () => {
		const fixture = render({ meta: "PS5", label: "Selected" });

		expect(text(fixture)).toContain("2020 · PS5");
		expect(text(fixture)).toContain("Selected");
	});

	it("omits the details line when there is no year or meta", () => {
		const fixture = render({ game: { title: "Hades" } });

		expect(text(fixture)).not.toContain("·");
		expect(
			(fixture.nativeElement as HTMLElement).querySelectorAll(
				"span.truncate"
			)
		).toHaveLength(1);
	});

	it("emits changeRequested from the Change game button", () => {
		const fixture = render();
		const requested = vi.fn();
		fixture.componentInstance.changeRequested.subscribe(requested);

		(
			(fixture.nativeElement as HTMLElement).querySelector(
				"button"
			) as HTMLButtonElement
		).click();

		expect(requested).toHaveBeenCalledOnce();
	});

	it("hides the button when the game cannot be changed", () => {
		const fixture = render({ changeable: false });

		expect(
			(fixture.nativeElement as HTMLElement).querySelector("button")
		).toBeNull();
	});

	it("focuses the Change game button when autofocus is on", async () => {
		const fixture = render({ autofocus: true });
		await fixture.whenStable();

		const button = (fixture.nativeElement as HTMLElement).querySelector(
			"button"
		);
		expect(document.activeElement).toBe(button);
	});
});
