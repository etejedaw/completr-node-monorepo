import { TestBed } from "@angular/core/testing";

import { type BacklogEntry, type GamePlatinum } from "../../../../core/models";
import { GamePlatinumCard } from "./game-platinum-card";

const RUNS = [{ id: "run-2" }, { id: "run-1" }] as BacklogEntry[];

describe("GamePlatinumCard", () => {
	function render(platinum: GamePlatinum | null, platformName = "PS5") {
		const fixture = TestBed.createComponent(GamePlatinumCard);
		fixture.componentRef.setInput("platinum", platinum);
		fixture.componentRef.setInput("runs", RUNS);
		fixture.componentRef.setInput("platformName", platformName);
		fixture.detectChanges();
		const requested = vi.fn();
		fixture.componentInstance.editRequested.subscribe(requested);
		return { element: fixture.nativeElement as HTMLElement, requested };
	}

	function button(element: HTMLElement, label: string) {
		return Array.from(element.querySelectorAll("button")).find(b =>
			b.textContent?.includes(label)
		);
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [GamePlatinumCard] });
	});

	it("offers Mark as platinumed when the game has no platinum", () => {
		const { element, requested } = render(null);

		button(element, "Mark as platinumed")?.click();

		expect(requested).toHaveBeenCalled();
		expect(element.querySelector('[role="img"]')).toBeNull();
	});

	it("shows the game trophy with date, platform, run and notes", () => {
		const { element, requested } = render({
			id: "platinum-1",
			backlogId: "run-1",
			platformId: "ps5",
			platinumedAt: "2026-03-12",
			notes: "Hard one"
		});

		const text = element.textContent?.replace(/\s+/g, " ") ?? "";
		expect(element.querySelector('[role="img"]')).not.toBeNull();
		expect(text).toContain("Platinumed on Mar 12, 2026");
		expect(text).toContain("PS5 · Run #1");
		expect(text).toContain("Hard one");
		button(element, "Edit")?.click();
		expect(requested).toHaveBeenCalled();
	});
});
