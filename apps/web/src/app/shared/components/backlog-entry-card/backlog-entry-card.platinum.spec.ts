import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { type BacklogEntry, type GamePlatinum } from "../../../core/models";
import { BacklogEntryCard } from "./backlog-entry-card";

const PLATINUM: GamePlatinum = {
	id: "platinum-1",
	backlogId: "run-1",
	platformId: "platform-1",
	platinumedAt: "2026-03-12"
};

function entry(id: string, platinum: GamePlatinum | null): BacklogEntry {
	return {
		id,
		status: "completed",
		isPublic: true,
		game: { id: "game-1", code: "hades", title: "Hades", isDlc: false },
		platform: { id: "platform-1", abbreviation: "PC" },
		platinum
	};
}

describe("BacklogEntryCard platinum trophy", () => {
	function render(value: BacklogEntry, readonly = false) {
		const fixture = TestBed.createComponent(BacklogEntryCard);
		fixture.componentRef.setInput("entry", value);
		fixture.componentRef.setInput("readonly", readonly);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	function gameTrophy(element: HTMLElement) {
		return element.querySelector('[role="img"][aria-label="Platinumed"]');
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [BacklogEntryCard],
			providers: [provideRouter([])]
		});
	});

	it("shows the run trophy with the date on the run where it was earned", () => {
		const element = render(entry("run-1", PLATINUM));

		expect(element.textContent).toContain("Platinumed on Mar 12, 2026");
		expect(gameTrophy(element)).toBeNull();
	});

	it("shows only the game trophy on another run of a platinumed game", () => {
		const element = render(entry("run-2", PLATINUM));

		expect(gameTrophy(element)).not.toBeNull();
		expect(element.textContent).not.toContain("Platinumed on");
	});

	it("shows the game trophy when the platinum has no run", () => {
		const element = render(
			entry("run-1", { ...PLATINUM, backlogId: null })
		);

		expect(gameTrophy(element)).not.toBeNull();
	});

	it("shows the trophies in the read-only public card", () => {
		const element = render(entry("run-1", PLATINUM), true);

		expect(element.textContent).toContain("Platinumed on Mar 12, 2026");
	});

	it("shows no trophy for a game without platinum", () => {
		const element = render(entry("run-1", null));

		expect(gameTrophy(element)).toBeNull();
		expect(element.textContent).not.toContain("Platinumed");
	});
});
