import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { GameTitleCell } from "./game-title-cell";

@Component({ template: "" })
class GamePage {}

describe("GameTitleCell", () => {
	function render(inputs: Record<string, unknown> = {}) {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([{ path: "games/:code", component: GamePage }])
			]
		});
		const fixture = TestBed.createComponent(GameTitleCell);
		fixture.componentRef.setInput("title", "Hades");
		fixture.componentRef.setInput("code", "hades");
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture;
	}

	function renderElement(inputs: Record<string, unknown> = {}) {
		return render(inputs).nativeElement as HTMLElement;
	}

	it("links the title to the game page", () => {
		const link = render().nativeElement.querySelector(
			"a"
		) as HTMLAnchorElement;

		expect(link.textContent).toContain("Hades");
		expect(link.getAttribute("href")).toBe("/games/hades");
	});

	it("shows the cover and the mood tags", () => {
		const element = renderElement({
			coverUrl: "https://example.com/hades.jpg",
			moodTags: ["intense"]
		});

		expect(element.querySelector("img")?.src).toBe(
			"https://example.com/hades.jpg"
		);
		expect(element.textContent).toContain("intense");
	});

	it("falls back to the placeholder poster without a cover", () => {
		const element = renderElement();

		expect(element.querySelector("img")).toBeNull();
		expect(element.querySelector('[role="img"]')).not.toBeNull();
	});

	it("does not let the title click bubble to the row", async () => {
		const fixture = render();
		const element = fixture.nativeElement as HTMLElement;
		const onRowClick = vi.fn();
		element.addEventListener("click", onRowClick);
		const link = element.querySelector("a") as HTMLAnchorElement;

		link.click();
		await fixture.whenStable();

		expect(onRowClick).not.toHaveBeenCalled();
	});
});
