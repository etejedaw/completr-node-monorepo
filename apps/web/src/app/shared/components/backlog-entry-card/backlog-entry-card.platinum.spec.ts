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

	function runTrophy(element: HTMLElement) {
		return element.querySelector(
			'[role="img"][aria-label="Platinumed in this run on Mar 12, 2026"]'
		);
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [BacklogEntryCard],
			providers: [provideRouter([])]
		});
	});

	it("shows only the run trophy, without text, on the run where it was earned", () => {
		const element = render(entry("run-1", PLATINUM));

		expect(runTrophy(element)).not.toBeNull();
		expect(gameTrophy(element)).toBeNull();
		expect(element.textContent).not.toContain("Platinumed");
	});

	it("shows only the game trophy on another run of a platinumed game", () => {
		const element = render(entry("run-2", PLATINUM));

		expect(gameTrophy(element)).not.toBeNull();
		expect(runTrophy(element)).toBeNull();
	});

	it("shows the game trophy when the platinum has no run", () => {
		const element = render(
			entry("run-1", { ...PLATINUM, backlogId: null })
		);

		expect(gameTrophy(element)).not.toBeNull();
	});

	it("shows the trophies in the read-only public card", () => {
		const element = render(entry("run-1", PLATINUM), true);

		expect(runTrophy(element)).not.toBeNull();
	});

	it("shows no trophy for a game without platinum", () => {
		const element = render(entry("run-1", null));

		expect(
			element.querySelector('[role="img"][aria-label^="Platinumed"]')
		).toBeNull();
	});
});
